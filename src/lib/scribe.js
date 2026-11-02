/** @typedef {import('./speech').MicStatus | 'config' | 'quota'} ScribeStatus */

const WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const RATE = 16000;
const CHUNK = RATE / 10; // 100 ms per message; ElevenLabs wants 0.1-1 s chunks
// Server errors that end the session but are worth reconnecting after; anything else stops captions.
const TRANSIENT = new Set(['insufficient_audio_activity', 'session_time_limit_exceeded', 'commit_throttled', 'queue_overflow']);

// Copies each 128-frame mic block to the main thread, where it is resampled to 16 kHz.
const WORKLET = `registerProcessor('sl-capture', class extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0][0]; if (ch) this.port.postMessage(ch.slice()); return true; }
});`;

export const scribeSupported =
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== 'undefined';

function toBase64(int16) {
  const bytes = new Uint8Array(int16.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Live captions via ElevenLabs Scribe realtime. Same interface as SpeechCaptioner so the lane can swap engines.
 * Audio goes to ElevenLabs; the API key stays on the server, which hands out single-use tokens (/api/scribe-token).
 */
export class ScribeCaptioner {
  /**
   * @param {{
   *   onStatus: (s: ScribeStatus) => void,
   *   onInterim: (text: string) => void,
   *   onFinal: (text: string, lang: string) => void,
   * }} callbacks
   */
  constructor({ onStatus, onInterim, onFinal }) {
    this.onStatus = onStatus;
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.wanted = false;
    this.suspended = false;
    this.lang = 'hi-IN';
    this.session = 0;
    this.ws = null;
    this.stream = null;
    this.ctx = null;
    this.retryTimer = 0;
    /** @type {ScribeStatus} */
    this.status = scribeSupported ? 'idle' : 'unsupported';
  }

  setStatus(s) {
    this.status = s;
    this.onStatus(s);
  }

  /** Ends the current session; bumping `session` also cancels any of start()'s pending async steps. */
  teardown() {
    this.session++;
    clearTimeout(this.retryTimer);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.onInterim('');
  }

  fail(s) {
    this.wanted = false;
    this.teardown();
    this.setStatus(s);
  }

  stop() {
    this.wanted = false;
    this.teardown();
    if (this.status === 'listening' || this.status === 'starting') this.setStatus('idle');
  }

  async start(lang = this.lang) {
    this.lang = lang;
    this.suspended = false;
    if (!scribeSupported) return this.setStatus('unsupported');
    this.teardown();
    this.wanted = true;
    const session = this.session;
    const stale = () => session !== this.session;
    this.setStatus('starting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      if (!stale()) this.fail(e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'denied' : e.name === 'NotFoundError' ? 'nomic' : 'error');
      return;
    }
    if (stale()) return stream.getTracks().forEach((t) => t.stop());
    this.stream = stream;

    let token;
    try {
      const res = await fetch('/api/scribe-token', { method: 'POST' });
      if (stale()) return;
      // 404: no token endpoint deployed; 502/503: key missing or rejected.
      if ([404, 502, 503].includes(res.status)) return this.fail('config');
      if (!res.ok) return this.fail('error');
      ({ token } = await res.json());
    } catch {
      if (!stale()) this.fail('network');
      return;
    }
    if (stale()) return;

    const params = new URLSearchParams({
      token,
      model_id: 'scribe_v2_realtime',
      language_code: lang.slice(0, 2),
      audio_format: `pcm_${RATE}`,
      commit_strategy: 'vad',
    });
    const ws = new WebSocket(`${WS_URL}?${params}`);
    this.ws = ws;
    let live = false;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.message_type === 'session_started') live = true;
      this.handle(msg, lang);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return; // closed by us
      this.ws = null;
      this.onInterim('');
      if (!live) return this.fail('network'); // never connected - don't retry in a loop
      // Sessions end on long silence or time limits; reconnect while the user still wants captions.
      if (this.wanted && !this.suspended && this.status === 'listening') {
        this.retryTimer = setTimeout(() => this.wanted && !this.suspended && this.start(this.lang), 500);
      }
    };
    try {
      await this.capture(ws, stale);
    } catch {
      if (!stale()) this.fail('error');
    }
  }

  async capture(ws, stale) {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    if (stale()) return;
    const node = new AudioWorkletNode(ctx, 'sl-capture');
    ctx.createMediaStreamSource(this.stream).connect(node);

    // Box-filter downsample from the device rate (usually 44.1/48 kHz) to 16 kHz, then 16-bit PCM.
    const step = ctx.sampleRate / RATE;
    const out = new Int16Array(CHUNK);
    let n = 0;
    let acc = 0;
    let count = 0;
    let t = 0;
    node.port.onmessage = ({ data }) => {
      for (let i = 0; i < data.length; i++) {
        acc += data[i];
        count++;
        if (++t < step) continue;
        t -= step;
        const v = Math.max(-1, Math.min(1, acc / count));
        out[n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        acc = count = 0;
        if (n === CHUNK) {
          n = 0;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: toBase64(out), commit: false, sample_rate: RATE }));
          }
        }
      }
    };
  }

  handle(msg, lang) {
    switch (msg.message_type) {
      case 'session_started':
        return this.setStatus('listening');
      case 'partial_transcript':
        return this.onInterim((msg.text ?? '').trim());
      case 'committed_transcript': {
        const text = (msg.text ?? '').trim();
        this.onInterim('');
        if (text) this.onFinal(text, lang);
        return;
      }
      case 'warning':
        return console.warn('ElevenLabs:', msg.warning);
      default:
        if (!msg.error) return;
        console.warn('ElevenLabs', msg.message_type, msg.error);
        if (TRANSIENT.has(msg.message_type)) return; // onclose reconnects
        this.fail(
          msg.message_type === 'auth_error' || msg.message_type === 'unaccepted_terms' ? 'config'
            : msg.message_type === 'quota_exceeded' || msg.message_type === 'rate_limited' ? 'quota'
              : 'error',
        );
    }
  }

  /** Pause while our own text-to-speech is playing so the mic doesn't caption it. Releases the mic and session. */
  suspend() {
    if (this.suspended) return;
    this.suspended = true;
    this.teardown();
  }

  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.wanted) this.start(this.lang);
  }

  setLang(lang) {
    if (lang === this.lang) return;
    this.lang = lang;
    if (this.wanted) this.start(lang);
  }

  destroy() {
    this.wanted = false;
    this.teardown();
  }
}
