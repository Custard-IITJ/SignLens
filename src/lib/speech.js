/** @typedef {'idle'|'starting'|'listening'|'denied'|'nomic'|'network'|'unsupported'|'error'} MicStatus */

const Ctor = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined;
export const speechSupported = !!Ctor;

/** Live captions via the Web Speech API (remote processing in most browsers). */
export class SpeechCaptioner {
  /**
   * @param {{
   *   onStatus: (s: MicStatus) => void,
   *   onInterim: (text: string) => void,
   *   onFinal: (text: string, lang: string) => void,
   * }} callbacks
   */
  constructor({ onStatus, onInterim, onFinal }) {
    this.onStatus = onStatus;
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.rec = null;
    this.wanted = false;
    this.suspended = false;
    this.lang = 'en-IN';
    /** @type {MicStatus} */
    this.status = speechSupported ? 'idle' : 'unsupported';
  }

  setStatus(s) {
    this.status = s;
    this.onStatus(s);
  }

  stop() {
    this.wanted = false;
    this.rec?.stop();
    this.rec = null;
    this.onInterim('');
    if (this.status === 'listening' || this.status === 'starting') this.setStatus('idle');
  }

  start(lang = this.lang) {
    this.lang = lang;
    this.suspended = false;
    if (!Ctor) return this.setStatus('unsupported');
    this.rec?.abort?.();
    this.wanted = true;
    this.setStatus('starting');
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => this.setStatus('listening');
    r.onresult = (e) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript.trim();
        if (res.isFinal) text && this.onFinal(text, lang);
        else partial += ' ' + text;
      }
      this.onInterim(partial.trim());
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this.wanted = false;
      this.setStatus(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'audio-capture' ? 'nomic' : e.error === 'network' ? 'network' : 'error');
    };
    r.onend = () => {
      this.onInterim('');
      // Engines stop after silence; restart without replaying finalised text.
      if (this.wanted && !this.suspended && this.rec === r) {
        try {
          r.start();
        } catch {
          this.setStatus('error');
        }
      }
    };
    this.rec = r;
    try {
      r.start();
    } catch {
      this.setStatus('error');
    }
  }

  /**
   * Pause while our own text-to-speech is playing so the mic doesn't caption it.
   * abort() discards any half-heard result instead of finalising it.
   */
  suspend() {
    if (this.suspended) return;
    this.suspended = true;
    this.rec?.abort?.();
    this.onInterim('');
  }

  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.wanted) this.start(this.lang);
  }

  /** Language change restarts the engine only if it was running. */
  setLang(lang) {
    if (lang === this.lang) return;
    this.lang = lang;
    if (this.wanted) this.start(lang);
  }

  destroy() {
    this.wanted = false;
    this.rec?.abort?.();
    this.rec = null;
  }
}
