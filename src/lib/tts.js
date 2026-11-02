/** @typedef {'idle'|'speaking'|'unsupported'|'error'} TtsStatus */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
export const ttsSupported = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';

/**
 * Text-to-speech via the browser's speechSynthesis, or ElevenLabs (through /api/tts) for Hindi when `remote` is set,
 * since many devices have no Hindi voice installed. English is never sent to ElevenLabs. Browser voices load asynchronously in
 * Chrome, so the list is refreshed on `voiceschanged`.
 */
export class Voice {
  /**
   * @param {{
   *   onStatus: (s: TtsStatus) => void,
   *   onVoices?: (voices: { uri: string, name: string, lang: string, local: boolean }[]) => void,
   * }} callbacks
   */
  constructor({ onStatus, onVoices }) {
    this.onStatus = onStatus;
    this.onVoices = onVoices;
    /** @type {SpeechSynthesisVoice[]} */
    this.voices = [];
    this.current = null;
    this.audio = null;
    this.request = null;
    if (!ttsSupported) return onStatus('unsupported');
    this.refresh = () => {
      this.voices = synth.getVoices();
      this.onVoices?.(this.voices.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService })));
    };
    synth.addEventListener('voiceschanged', this.refresh);
    this.refresh();
  }

  /**
   * Preferred URI if present, else the best voice for the language (exact locale, then language, local first).
   * @param {string} lang BCP-47, e.g. 'en-IN' or 'hi-IN'
   * @param {string} [uri]
   */
  pick(lang, uri) {
    const want = lang.toLowerCase().replace('_', '-');
    const base = want.split('-')[0];
    const norm = (v) => v.lang.toLowerCase().replace('_', '-');
    const byUri = uri && this.voices.find((v) => v.voiceURI === uri);
    if (byUri && norm(byUri).startsWith(base)) return byUri;
    const exact = this.voices.filter((v) => norm(v) === want);
    const same = this.voices.filter((v) => norm(v).split('-')[0] === base);
    const pool = exact.length ? exact : same;
    return pool.find((v) => v.localService) ?? pool[0] ?? null;
  }

  /**
   * @param {string} text
   * @param {string} lang
   * @param {{ rate?: number, uri?: string, remote?: boolean }} [opts] remote = speak Hindi with ElevenLabs
   */
  speak(text, lang, { rate = 1, uri, remote = false } = {}) {
    if (!text.trim()) return;
    this.halt();
    if (remote && lang === 'hi-IN') return this.speakRemote(text, lang, rate, uri);
    this.speakLocal(text, lang, rate, uri);
  }

  speakLocal(text, lang, rate, uri) {
    if (!ttsSupported) return this.onStatus('error');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const v = this.pick(lang, uri);
    if (v) u.voice = v;
    u.onstart = () => this.onStatus('speaking');
    u.onend = () => this.current === u && this.done('idle');
    // 'interrupted'/'canceled' fire when a newer utterance replaces this one.
    u.onerror = (e) => this.current === u && this.done(e.error === 'interrupted' || e.error === 'canceled' ? 'idle' : 'error');
    this.current = u;
    this.onStatus('speaking');
    synth.speak(u);
  }

  async speakRemote(text, lang, rate, uri) {
    const turn = {};
    this.current = turn;
    this.onStatus('speaking');
    const request = new AbortController();
    this.request = request;
    let url;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
        signal: request.signal,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      url = URL.createObjectURL(await res.blob());
      if (this.current !== turn) return URL.revokeObjectURL(url);
      const audio = new Audio(url);
      audio.playbackRate = rate;
      this.audio = audio;
      const finish = (s) => {
        URL.revokeObjectURL(url);
        if (this.current === turn) this.done(s);
      };
      audio.onended = () => finish('idle');
      audio.onerror = () => finish('error');
      await audio.play();
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      if (this.current !== turn || e.name === 'AbortError') return;
      // ElevenLabs unavailable (no key, quota, offline): try the browser's own voice instead.
      console.warn('ElevenLabs speech failed, using the browser voice:', e.message);
      this.speakLocal(text, lang, rate, uri);
    }
  }

  /** Stops whatever is playing or being fetched, without reporting a status change. */
  halt() {
    this.current = null;
    this.request?.abort();
    this.request = null;
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
    if (ttsSupported) synth.cancel();
  }

  done(s) {
    this.current = null;
    this.onStatus(s);
  }

  cancel() {
    this.halt();
    this.onStatus('idle');
  }

  destroy() {
    if (ttsSupported) synth.removeEventListener('voiceschanged', this.refresh);
    this.cancel();
  }
}
