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
        @click="on ? speech.stop() : speech.start(lang)"
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
      Grey italic text is provisional; finished sentences move into the conversation. Most browsers send audio to a remote speech service.
    </p>
  </section>
</template>

<script>
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
      status: speechSupported ? 'idle' : 'unsupported',
      interim: '',
      supported: speechSupported,
      messages: MESSAGES,
    };
  },
  computed: {
    lang() {
      return this.settings.captionLang;
    },
    on() {
      return this.status === 'listening' || this.status === 'starting';
    },
    bad() {
      return ['denied', 'nomic', 'network', 'unsupported', 'error'].includes(this.status);
    },
  },
  watch: {
    lang(l) {
      this.speech.setLang(l);
    },
    status(s) {
      this.$emit('mic-change', s === 'listening');
    },
    speaking(on) {
      if (on) this.speech.suspend();
      else this.speech.resume();
    },
  },
  created() {
    // Kept off `data` so Vue doesn't proxy the recogniser.
    this.speech = new SpeechCaptioner({
      onStatus: (s) => (this.status = s),
      onInterim: (t) => (this.interim = t),
      onFinal: (t, l) => this.$emit('final', t, l),
    });
    this.speech.lang = this.lang;
  },
  beforeUnmount() {
    this.speech.destroy();
    this.$emit('mic-change', false);
  },
};
</script>
