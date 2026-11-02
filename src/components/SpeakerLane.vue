<template>
  <section class="lane speaker" aria-labelledby="speaker-h">
    <header class="lane-head">
      <h2 id="speaker-h"><span class="lane-dot" aria-hidden="true" />Speaker</h2>
      <div class="seg small" role="radiogroup" aria-label="Spoken language">
        <button
          v-for="[l, name] in [['en-IN', 'English'], ['hi-IN', 'हिन्दी']]"
          :key="l"
          role="radio"
          :aria-checked="lang === l"
          :class="{ active: lang === l }"
          @click="$emit('update-settings', { captionLang: l })"
        >{{ name }}</button>
      </div>
    </header>

    <div class="listen">
      <button
        :class="['mic', { on, paused: on && speaking }]"
        :disabled="!supported"
        :aria-pressed="on"
        :aria-label="on ? 'Stop listening' : 'Start listening'"
        @click="on ? engine().stop() : engine().start(lang)"
      >
        <span aria-hidden="true">{{ on ? '■' : '🎙️' }}</span>
      </button>
      <div :class="['status', bad ? 'warn' : on ? 'ok' : 'idle']" role="status" aria-live="polite">
        {{ on && speaking ? 'Paused while the app is speaking…' : messages[status] }}
      </div>
    </div>

    <div class="caption-box" :style="{ fontSize: settings.textSize + 'px' }" :lang="lang.slice(0, 2)" aria-live="polite">
      <span v-if="interim" class="interim">{{ interim }}</span>
      <span v-else class="placeholder">{{ on ? 'Waiting for speech…' : 'Live captions appear here' }}</span>
    </div>
    <p class="muted small">
      Grey italic text is provisional; finished sentences move into the conversation.
      {{ useScribe ? 'Hindi captions are transcribed by ElevenLabs Scribe, which receives the microphone audio.' : 'Most browsers send audio to a remote speech service.' }}
    </p>
  </section>
</template>

<script>
import { ScribeCaptioner, scribeSupported } from '../lib/scribe';
import { SpeechCaptioner, speechSupported } from '../lib/speech';

const MESSAGES = {
  idle: 'Tap the mic to caption the other person',
  starting: 'Starting microphone…',
  listening: 'Listening…',
  denied: 'Microphone permission denied. Allow it in your browser’s site settings, then try again.',
  nomic: 'No microphone was found.',
  network: 'Speech service unreachable (network error). Captions need an internet connection in this browser.',
  unsupported: 'This browser does not support speech recognition. Try Chrome or Edge on desktop. Signing still works.',
  error: 'Speech recognition stopped unexpectedly. Tap the mic to retry.',
  config: 'ElevenLabs captions aren’t set up on this server (missing or invalid ELEVENLABS_API_KEY). Switch Hindi captions to the browser engine in Settings.',
  quota: 'ElevenLabs usage limit reached. Try again later, or switch Hindi captions to the browser engine in Settings.',
};

export default {
  name: 'SpeakerLane',
  props: {
    settings: { type: Object, required: true },
    /** True while text-to-speech is playing; recognition pauses so it doesn't caption the app's own voice. */
    speaking: { type: Boolean, default: false },
  },
  emits: ['update-settings', 'final', 'mic-change'],
  data() {
    return {
      status: 'idle',
      interim: '',
      messages: MESSAGES,
    };
  },
  computed: {
    lang() {
      return this.settings.captionLang;
    },
    /** Hindi can use ElevenLabs Scribe; English always uses the browser's recogniser. */
    useScribe() {
      return this.lang === 'hi-IN' && this.settings.hindiEngine === 'elevenlabs';
    },
    supported() {
      return this.useScribe ? scribeSupported : speechSupported;
    },
    on() {
      return this.status === 'listening' || this.status === 'starting';
    },
    bad() {
      return ['denied', 'nomic', 'network', 'unsupported', 'error', 'config', 'quota'].includes(this.status);
    },
  },
  watch: {
    lang(l, old) {
      this.switchEngine(old, this.settings.hindiEngine);
    },
    'settings.hindiEngine'(e, old) {
      this.switchEngine(this.lang, old);
    },
    status(s) {
      this.$emit('mic-change', s === 'listening');
    },
    speaking(on) {
      if (on) this.engine().suspend();
      else this.engine().resume();
    },
  },
  created() {
    // Kept off `data` so Vue doesn't proxy the recognisers.
    const callbacks = {
      onStatus: (s) => (this.status = s),
      onInterim: (t) => (this.interim = t),
      onFinal: (t, l) => this.$emit('final', t, l),
    };
    this.browser = new SpeechCaptioner(callbacks);
    this.scribe = new ScribeCaptioner(callbacks);
    this.browser.lang = this.scribe.lang = this.lang;
    this.status = this.supported ? 'idle' : 'unsupported';
  },
  beforeUnmount() {
    this.browser.destroy();
    this.scribe.destroy();
    this.$emit('mic-change', false);
  },
  methods: {
    engine(lang = this.lang, hindiEngine = this.settings.hindiEngine) {
      return lang === 'hi-IN' && hindiEngine === 'elevenlabs' ? this.scribe : this.browser;
    },
    /** Moves listening to the right engine after the language or Hindi engine changed. */
    switchEngine(oldLang, oldHindiEngine) {
      const prev = this.engine(oldLang, oldHindiEngine);
      const next = this.engine();
      const wasOn = this.on;
      if (prev !== next) {
        prev.stop();
        next.lang = this.lang;
        if (wasOn) next.start(this.lang);
        else this.status = this.supported ? 'idle' : 'unsupported';
      } else next.setLang(this.lang);
    },
  },
};
</script>
