<template>
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <button class="brand" aria-label="SignLens — conversation" @click="view = 'talk'">
      <img class="logo" src="/favicon.svg" alt="" width="36" height="36" />
      <span>Sign<b>Lens</b></span>
    </button>
    <nav aria-label="Main">
      <button
        v-for="[v, label] in nav"
        :key="v"
        :class="{ active: view === v }"
        :aria-current="view === v ? 'page' : undefined"
        @click="view = v"
      >{{ label }}</button>
    </nav>
    <div class="top-right">
      <div class="status-pills" aria-label="Device status">
        <span :class="['badge', { on: camera }]"><i /> Camera</span>
        <span :class="['badge', { on: mic }]"><i /> Mic</span>
        <span :class="['badge', { on: speaking }]"><i /> Voice</span>
      </div>
      <button
        class="theme-toggle"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="updateSettings({ theme: isDark ? 'light' : 'dark' })"
      >
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </div>
  </header>
  <div class="disclaimer" role="note"><span aria-hidden="true">⚠</span> Experimental assistive tool — not a substitute for a qualified ISL interpreter.</div>

  <main id="main">
    <div v-if="view === 'talk'" class="talk">
      <SignerLane
        :vocab="vocab"
        :samples="samples"
        :settings="settings"
        :speaking="speaking"
        @send="sendSigned"
        @speak="speak"
        @stop-speaking="voice.cancel()"
        @camera-change="camera = $event"
        @update-settings="updateSettings"
        @go="view = $event"
      />
      <div class="side">
        <SpeakerLane
          :settings="settings"
          :speaking="speaking"
          @update-settings="updateSettings"
          @final="heard"
          @mic-change="mic = $event"
        />
        <Transcript :entries="entries" :settings="settings" :vocab="vocab" @clear="entries = []" @speak="speak" />
      </div>
    </div>
    <Dictionary v-else-if="view === 'dictionary'" :vocab="vocab" :samples="samples" @speak="speak" />
    <PasswordLock v-else-if="view === 'teach' && !unlocked" title="Teach signs" @unlock="unlock" />
    <TeachView
      v-else-if="view === 'teach'"
      :vocab="vocab"
      :samples="samples"
      :storage-error="storageError"
      @add-samples="addSamples"
      @clear-sign="clearSign"
      @clear-all="replaceSamples([])"
      @replace-samples="replaceSamples"
      @camera-change="camera = $event"
      @lock="lock"
    />
    <SettingsView
      v-else-if="view === 'settings'"
      :settings="settings"
      :camera="camera"
      :mic="mic"
      :voices="voices"
      :tts-supported="ttsSupported"
      @update-settings="updateSettings"
      @speak="speak"
    />
    <About v-else-if="view === 'about'" :vocab="vocab" />
  </main>
  <!-- <footer class="foot">Hand landmarks processed on-device · No accounts · Conversation is never stored</footer> -->
  <footer class="foot">Made by Console.log("Custard")</footer>
</template>

<script>
import { markRaw } from 'vue';
import vocabJson from './data/isl-vocabulary.json';
import About from './components/About.vue';
import Dictionary from './components/Dictionary.vue';
import PasswordLock from './components/PasswordLock.vue';
import SettingsView from './components/SettingsView.vue';
import SignerLane from './components/SignerLane.vue';
import SpeakerLane from './components/SpeakerLane.vue';
import TeachView from './components/TeachView.vue';
import Transcript from './components/Transcript.vue';
import { FILE_WRITABLE, loadData, loadSamples, saveData, whenSaved } from './lib/storage';
import { rememberedUnlock, rememberUnlock, TEACH_LOCK } from './lib/teachLock';
import { DEFAULT_SETTINGS } from './lib/types';
import { ttsSupported, Voice } from './lib/tts';
import { findSignsInText, loadVocabulary } from './lib/vocabulary';

/** @typedef {'talk'|'dictionary'|'teach'|'settings'|'about'} View */

const NAV = [
  ['talk', 'Conversation'], ['dictionary', 'Signs'], ['teach', 'Teach'], ['settings', 'Settings'], ['about', 'About'],
];

const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

export default {
  name: 'App',
  components: { About, Dictionary, PasswordLock, SettingsView, SignerLane, SpeakerLane, TeachView, Transcript },
  data() {
    return {
      /** @type {View} */
      view: 'talk',
      nav: NAV,
      vocab: markRaw(loadVocabulary(vocabJson)),
      settings: { ...DEFAULT_SETTINGS },
      // Samples are frozen so Vue doesn't deep-proxy thousands of numbers read on every camera frame.
      samples: Object.freeze([]),
      // Nothing is written back until the data file has been read, so defaults never overwrite it.
      loaded: false,
      storageError: false,
      // The password unlocks Teach for this tab.
      unlocked: TEACH_LOCK === 'open' || rememberedUnlock(),
      /** @type {import('./lib/types').Entry[]} */
      entries: [],
      camera: false,
      mic: false,
      speaking: false,
      voices: [],
      ttsSupported,
      systemDark: darkQuery?.matches ?? false,
    };
  },
  computed: {
    /** Whether dark colours are showing (explicit choice, or OS preference when theme is 'system'). */
    isDark() {
      const t = this.settings.theme;
      return t === 'dark' || (t === 'system' && this.systemDark);
    },
  },
  watch: {
    settings: 'persist',
    samples: 'persist',
    view(v) {
      // The conversation view recognises signs from whatever is currently in the data file.
      // The built site's shipped file never changes, so there is nothing to re-read there.
      if (v === 'talk' && this.loaded && FILE_WRITABLE) this.reloadSamples();
    },
    'settings.highContrast': {
      handler(on) {
        document.documentElement.dataset.contrast = on ? 'high' : '';
      },
      immediate: true,
    },
    'settings.theme': {
      handler(t) {
        if (t === 'system') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = t;
      },
      immediate: true,
    },
  },
  created() {
    this.nextId = 1;
    this.onSystemTheme = (e) => (this.systemDark = e.matches);
    darkQuery?.addEventListener('change', this.onSystemTheme);
    // Kept off `data` so Vue doesn't proxy the synthesiser.
    this.voice = new Voice({
      onStatus: (s) => (this.speaking = s === 'speaking'),
      onVoices: (v) => (this.voices = v),
    });
  },
  async mounted() {
    try {
      const { settings, samples, migrated } = await loadData();
      this.settings = settings;
      this.samples = Object.freeze(samples);
      this.loaded = true;
      if (migrated) this.persist();
    } catch {
      this.storageError = true;
    }
  },
  beforeUnmount() {
    this.voice.destroy();
    darkQuery?.removeEventListener('change', this.onSystemTheme);
  },
  methods: {
    async persist() {
      if (!this.loaded) return;
      this.storageError = !(await saveData(this.settings, this.samples));
    },
    async reloadSamples() {
      try {
        await whenSaved(); // otherwise a just-recorded sample could be replaced by the older file
        const samples = await loadSamples();
        // Only swap if the file changed, so the engine isn't handed a new array for nothing.
        if (JSON.stringify(samples) !== JSON.stringify(this.samples)) this.samples = Object.freeze(samples);
      } catch {
        this.storageError = true;
      }
    },
    push(entry) {
      this.entries.push({ id: this.nextId++, time: Date.now(), ...entry });
    },
    /** @param {string} text @param {string} lang BCP-47 */
    speak(text, lang) {
      const s = this.settings;
      const hindi = lang.startsWith('hi');
      this.voice.speak(text, lang, { rate: s.voiceRate, uri: hindi ? s.voiceHi : s.voiceEn, remote: hindi && s.hindiEngine === 'elevenlabs' });
    },
    sendSigned({ text, lang, alt }) {
      this.push({ source: 'sign', text, lang, alt });
      if (this.settings.autoSpeak) this.speak(text, lang);
    },
    heard(text, lang) {
      this.push({ source: 'speech', text, lang, signIds: findSignsInText(text, this.vocab).map((s) => s.id) });
    },
    updateSettings(patch) {
      this.settings = { ...this.settings, ...patch };
    },
    addSamples(s) {
      this.samples = Object.freeze([...this.samples, ...s]);
    },
    clearSign(id) {
      this.samples = Object.freeze(this.samples.filter((s) => s.signId !== id));
    },
    unlock() {
      this.unlocked = true;
      rememberUnlock(true);
    },
    lock() {
      this.unlocked = false;
      rememberUnlock(false);
    },
    replaceSamples(s) {
      this.samples = Object.freeze([...s]);
    },
  },
};
</script>
