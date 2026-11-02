/** @typedef {'idle'|'speaking'|'unsupported'|'error'} TtsStatus */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
export const ttsSupported = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';

/**
 * Text-to-speech via the browser's speechSynthesis. Voices load asynchronously in Chrome,
 * so the list is refreshed on `voiceschanged`.
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
   * @param {{ rate?: number, uri?: string }} [opts]
   */
  speak(text, lang, { rate = 1, uri } = {}) {
    if (!ttsSupported || !text.trim()) return;
    synth.cancel();
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

  done(s) {
    this.current = null;
    this.onStatus(s);
  }

  cancel() {
    if (!ttsSupported) return;
    this.current = null;
    synth.cancel();
    this.onStatus('idle');
  }

  destroy() {
    if (!ttsSupported) return;
    synth.removeEventListener('voiceschanged', this.refresh);
    this.cancel();
  }
}
