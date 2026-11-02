<template>
  <div class="settings">
    <div class="page-head">
      <h1>Settings &amp; Privacy</h1>
    </div>
    <div class="two">
      <section class="panel">
        <h2>Preferences</h2>
        <div class="field">Appearance
          <div class="seg" role="radiogroup" aria-label="Appearance">
            <button
              v-for="[t, name] in [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]"
              :key="t"
              role="radio"
              :aria-checked="settings.theme === t"
              :class="{ active: settings.theme === t }"
              @click="set('theme', t)"
            >{{ name }}</button>
          </div>
          <small v-if="settings.highContrast">High-contrast mode is on and overrides the theme.</small>
        </div>
        <div class="field">Hindi speech engine (captions &amp; voice)
          <div class="seg" role="radiogroup" aria-label="Hindi speech engine">
            <button
              v-for="[e, name] in [['elevenlabs', 'ElevenLabs'], ['browser', 'Browser']]"
              :key="e"
              role="radio"
              :aria-checked="settings.hindiEngine === e"
              :class="{ active: settings.hindiEngine === e }"
              @click="set('hindiEngine', e)"
            >{{ name }}</button>
          </div>
          <small>ElevenLabs transcribes and speaks Hindi in any modern browser, even without a Hindi voice installed; it needs the server’s API key. English always uses the browser.</small>
        </div>
        <label class="field">Caption &amp; message text size: <b>{{ settings.textSize }}px</b>
          <input type="range" :min="18" :max="56" :value="settings.textSize" @input="set('textSize', +$event.target.value)" />
        </label>
        <label class="field">Recognition strictness: <b>{{ strictnessLabel }}</b>
          <input type="range" :min="0" :max="1" :step="0.05" :value="settings.strictness" @input="set('strictness', +$event.target.value)" />
          <small>Stricter = fewer wrong words, more “please repeat”.</small>
        </label>
        <label class="check"><input type="checkbox" :checked="settings.showHindi" @change="set('showHindi', $event.target.checked)" /> Show Hindi label on recognised signs</label>
        <label class="check"><input type="checkbox" :checked="settings.highContrast" @change="set('highContrast', $event.target.checked)" /> High-contrast mode</label>

        <h3>Voice (text to speech)</h3>
        <p v-if="!ttsSupported" class="err-text">This browser can’t speak text aloud. Messages are still shown on screen.</p>
        <template v-else>
          <label class="check"><input type="checkbox" :checked="settings.autoSpeak" @change="set('autoSpeak', $event.target.checked)" /> Speak signed messages aloud when sent</label>
          <label class="field">Speaking rate: <b>{{ settings.voiceRate.toFixed(1) }}×</b>
            <input type="range" :min="0.6" :max="1.6" :step="0.1" :value="settings.voiceRate" @input="set('voiceRate', +$event.target.value)" />
          </label>
          <div v-for="[key, lang, label, sample] in voiceRows" :key="key" class="field">
            {{ label }} voice
            <div class="row tight">
              <select
                :value="settings[key]"
                :aria-label="`${label} voice`"
                :disabled="lang === 'hi-IN' && settings.hindiEngine === 'elevenlabs'"
                @change="set(key, $event.target.value)"
              >
                <option value="">Automatic</option>
                <option v-for="v in voicesFor(lang)" :key="v.uri" :value="v.uri">{{ v.name }} ({{ v.lang }}){{ v.local ? '' : ' · online' }}</option>
              </select>
              <button class="btn small" @click="$emit('speak', sample, lang)">▶ Test</button>
            </div>
            <small v-if="lang === 'hi-IN' && settings.hindiEngine === 'elevenlabs'">Spoken by ElevenLabs; this browser voice is only used if ElevenLabs is unavailable.</small>
            <small v-else-if="voices.length && !voicesFor(lang).length" class="hint">
              No {{ label }} voice is installed — it will be read with a default voice. Add one in your OS language/speech settings.
            </small>
          </div>
        </template>
        <h3>Device status</h3>
        <p><span :class="['dot', { on: camera }]" /> Camera {{ camera ? 'on' : 'off' }} &nbsp; <span :class="['dot', { on: mic }]" /> Microphone {{ mic ? 'listening' : 'off' }}</p>
      </section>

      <section class="panel">
        <h2>Privacy</h2>
        <ul>
          <li>Camera frames are processed locally in your browser; video is never recorded or uploaded.</li>
          <li>Conversation text lives in memory only and disappears on refresh unless you export it.</li>
          <li v-if="fileWritable">Taught sign samples are landmark numbers saved to <code>src/data/isl-data.json</code> in the app folder; delete them any time in <em>Teach</em>.</li>
          <li v-else>Built-in sign samples ship with the app; samples you teach are landmark numbers stored in this browser only. Delete them any time in <em>Teach</em>.</li>
          <li>Spoken output uses voices installed in your browser/OS; some online voices send the text to the vendor.</li>
          <li><b>Speech captions:</b> Chrome and Edge typically send microphone audio to a remote speech service. Do not use captions for confidential conversations.</li>
          <li v-if="settings.hindiEngine === 'elevenlabs'"><b>Hindi captions</b> stream microphone audio to ElevenLabs for transcription, and Hindi text is sent to ElevenLabs to be spoken.</li>
          <li>The hand-tracking model (~8&nbsp;MB) is downloaded from Google’s CDN on first use.</li>
          <li>Reference sign videos on the Signs page are embedded from YouTube (privacy-enhanced mode), only when you open one.</li>
        </ul>
        <h2>Limitations</h2>
        <ul>
          <li>Experimental assistive tool — <b>not a substitute for a qualified ISL interpreter</b>, and not for medical, legal or emergency use.</li>
          <li>Only taught, reviewer-approved signs are recognised; unknown signs should show “please repeat”.</li>
          <li>Signs are translated word-by-word in the signer’s order; ISL grammar is not re-ordered into English or Hindi sentence structure.</li>
          <li>Facial expression, body posture and regional variants are not modelled.</li>
        </ul>
        <h2>Troubleshooting</h2>
        <ul>
          <li>Allow camera/microphone in the browser’s address-bar site settings; HTTPS or localhost is required.</li>
          <li>Good front lighting and a plain background improve tracking.</li>
          <li>With the Browser engine, Hindi captions need a browser/OS with Hindi (hi-IN) recognition available.</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script>
import { FILE_WRITABLE } from '../lib/storage';

export default {
  name: 'SettingsView',
  props: {
    settings: { type: Object, required: true },
    camera: { type: Boolean, default: false },
    mic: { type: Boolean, default: false },
    voices: { type: Array, default: () => [] },
    ttsSupported: { type: Boolean, default: false },
  },
  emits: ['update-settings', 'speak'],
  data() {
    return {
      fileWritable: FILE_WRITABLE,
      voiceRows: [
        ['voiceEn', 'en-IN', 'English', 'Hello, thank you.'],
        ['voiceHi', 'hi-IN', 'Hindi', 'नमस्ते, धन्यवाद।'],
      ],
    };
  },
  computed: {
    strictnessLabel() {
      const s = this.settings.strictness;
      return s < 0.34 ? 'Lenient' : s < 0.67 ? 'Balanced' : 'Strict';
    },
  },
  methods: {
    voicesFor(lang) {
      const base = lang.split('-')[0];
      return this.voices.filter((v) => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base);
    },
    set(key, value) {
      this.$emit('update-settings', { [key]: value });
    },
  },
};
</script>
