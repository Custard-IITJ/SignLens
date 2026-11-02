<template>
  <section class="lane signer" aria-labelledby="signer-h">
    <header class="lane-head">
      <h2 id="signer-h"><span class="lane-dot" aria-hidden="true" />Signer</h2>
      <span class="muted small">Sign → {{ settings.signLang === 'hi' ? 'Hindi' : 'English' }} text → voice</span>
    </header>

    <CameraStage @hands="onHands" @status="onCamStatus">
      <div v-if="lastAdded" class="match" role="status">
        <div class="match-main">
          <small>Added</small>
          <strong :lang="settings.signLang">{{ word(lastAdded.sign) }}</strong>
          <span v-if="settings.showHindi" class="match-alt" :lang="otherLang">{{ word(lastAdded.sign, otherLang) }}</span>
        </div>
        <div class="match-meta">
          <span class="tag">{{ lastAdded.sign.type === 'static' ? '✋ static' : '👋 moving' }}</span>
          <span class="tag">{{ lastAdded.sign.hands }} hand{{ lastAdded.sign.hands > 1 ? 's' : '' }}</span>
          <span v-if="lastAdded.sign.reviewStatus !== 'approved'" class="tag warn-tag" title="Not yet approved by an ISL-fluent reviewer">review pending</span>
          <span class="meter" :title="`Match confidence ${pct}%`"><i :style="{ width: pct + '%' }" /></span>
        </div>
        <div class="match-actions">
          <button v-for="(s, i) in lastAdded.alternatives" :key="s.id" class="btn glass" @click="swap(s)">
            {{ word(s) }} <kbd>{{ i + 2 }}</kbd>
          </button>
          <button class="btn glass" @click="undo">✕ Wrong sign <kbd>Backspace</kbd></button>
        </div>
      </div>
    </CameraStage>

    <div v-if="running" :class="['status', statusInfo.cls]" role="status" aria-live="polite">
      <span aria-hidden="true">{{ statusInfo.icon }}</span> {{ statusInfo.text }}
      <progress v-if="state.phase === 'ready' && state.progress > 0" :max="1" :value="state.progress" aria-label="Hold steady" />
      <button v-if="state.phase === 'untrained'" class="link" @click="$emit('go', 'teach')">Open Teach</button>
    </div>

    <div class="builder">
      <div class="builder-head">
        <span class="label">Message</span>
        <div class="seg small" role="radiogroup" aria-label="Translate signs into">
          <button
            v-for="[l, name] in [['en', 'English'], ['hi', 'हिन्दी']]"
            :key="l"
            role="radio"
            :aria-checked="settings.signLang === l"
            :class="{ active: settings.signLang === l }"
            @click="$emit('update-settings', { signLang: l })"
          >{{ name }}</button>
        </div>
      </div>

      <div class="tokens" @click="$refs.typed.focus()">
        <span v-for="t in tokens" :key="t.key" :class="['token', { typed: !t.signId }]">
          <span :lang="settings.signLang">{{ tokenText(t) }}</span>
          <small v-if="t.signId && settings.showHindi" :lang="otherLang">{{ tokenText(t, otherLang) }}</small>
          <button class="x" :aria-label="`Remove ${tokenText(t)}`" @click.stop="remove(t.key)">×</button>
        </span>
        <input
          ref="typed"
          v-model="typed"
          class="token-input"
          :placeholder="tokens.length ? 'Type a word…' : 'Recognised signs collect here — or type / pick a sign'"
          aria-label="Type a word"
          @keydown.enter.prevent="typed.trim() ? addTyped() : send()"
          @keydown.backspace="!typed && tokens.length && tokens.pop()"
        />
      </div>

      <p class="preview" :lang="settings.signLang" :style="{ fontSize: settings.textSize + 'px' }" aria-live="polite">
        <template v-if="text">{{ text }}</template>
        <span v-else class="placeholder">Your sentence will appear here</span>
      </p>

      <div class="row">
        <button class="btn" :aria-expanded="palette" @click="palette = !palette">🔤 Pick a sign</button>
        <button class="btn" :disabled="!text" @click="speakPreview">{{ speaking ? '■ Stop' : '🔊 Speak' }}</button>
        <button class="btn ghost" :disabled="!tokens.length" @click="tokens = []">Clear</button>
        <button class="btn primary push" :disabled="!text && !typed.trim()" @click="send">
          Send{{ settings.autoSpeak ? ' & speak' : '' }} ➤
        </button>
      </div>

      <SignPalette v-if="palette" :vocab="vocab" :lang="settings.signLang" @pick="addSign" />
    </div>
  </section>
</template>

<script>
import { SignEngine } from '../lib/engine';
import { composeText, signWord } from '../lib/vocabulary';
import CameraStage from './CameraStage.vue';
import SignPalette from './SignPalette.vue';

export default {
  name: 'SignerLane',
  components: { CameraStage, SignPalette },
  props: {
    vocab: { type: Object, required: true },
    samples: { type: Array, required: true },
    settings: { type: Object, required: true },
    speaking: { type: Boolean, default: false },
  },
  emits: ['send', 'speak', 'stop-speaking', 'camera-change', 'update-settings', 'go'],
  data() {
    return {
      state: { phase: 'nohand', progress: 0 },
      camStatus: 'idle',
      /** @type {import('../lib/types').Token[]} */
      tokens: [],
      typed: '',
      palette: false,
      /** Most recent auto-added sign, kept so it can be undone or swapped for an alternative. */
      lastAdded: null,
    };
  },
  computed: {
    running() {
      return this.camStatus === 'running';
    },
    otherLang() {
      return this.settings.signLang === 'hi' ? 'en' : 'hi';
    },
    candidate() {
      return this.state.phase === 'candidate' && this.state.signId ? this.vocab.byId.get(this.state.signId) : undefined;
    },
    alternatives() {
      return (this.state.alternatives ?? []).map((id) => this.vocab.byId.get(id)).filter(Boolean);
    },
    pct() {
      return Math.round((this.lastAdded?.confidence ?? 0) * 100);
    },
    text() {
      return composeText(this.tokens, this.vocab, this.settings.signLang);
    },
    statusInfo() {
      switch (this.state.phase) {
        case 'nohand':
          return { icon: '✋', text: 'No hand detected — raise a hand inside the frame', cls: 'warn' };
        case 'moving':
          return { icon: '〰', text: 'Watching the movement…', cls: 'info' };
        case 'candidate':
          return { icon: '✔', text: 'Sign added — press Backspace if it is wrong', cls: 'ok' };
        case 'uncertain':
          return { icon: '?', text: 'Not recognised — please repeat the sign', cls: 'warn' };
        case 'untrained':
          return { icon: '🎓', text: 'No trained samples for this kind of sign yet.', cls: 'warn' };
        default:
          return { icon: '◔', text: this.state.progress > 0 ? 'Hold steady…' : 'Ready — show a sign', cls: 'info' };
      }
    },
  },
  watch: {
    running(on) {
      this.$emit('camera-change', on);
    },
    candidate(sign) {
      if (sign) this.accept();
    },
    tokens(list) {
      // Forget the undo target once its token is gone (removed, cleared or sent).
      if (this.lastAdded && !list.some((t) => t.key === this.lastAdded.key)) this.lastAdded = null;
    },
  },
  created() {
    this.nextKey = 1;
    // Engine lives outside `data` so Vue never proxies per-frame Float32Arrays.
    this.engine = new SignEngine(
      () => this.samples,
      () => this.settings.strictness,
      (s) => (this.state = s),
    );
  },
  mounted() {
    window.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey);
    this.$emit('camera-change', false);
  },
  methods: {
    word(sign, lang = this.settings.signLang) {
      return signWord(sign, lang);
    },
    tokenText(t, lang = this.settings.signLang) {
      const sign = t.signId && this.vocab.byId.get(t.signId);
      return sign ? signWord(sign, lang) : t.text;
    },
    onHands(hands, t) {
      this.engine.feed(hands, t);
    },
    onCamStatus(s) {
      this.camStatus = s;
      if (s !== 'running') this.state = { phase: 'nohand', progress: 0 };
    },
    addSign(sign) {
      this.tokens.push({ key: this.nextKey++, signId: sign.id });
    },
    addTyped() {
      this.typed
        .trim()
        .split(/\s+/)
        .forEach((w) => this.tokens.push({ key: this.nextKey++, text: w }));
      this.typed = '';
    },
    remove(key) {
      this.tokens = this.tokens.filter((t) => t.key !== key);
    },
    accept() {
      const sign = this.candidate;
      if (!sign) return;
      const key = this.nextKey;
      this.addSign(sign);
      this.lastAdded = { key, sign, alternatives: this.alternatives, confidence: this.state.confidence };
      this.engine.release();
    },
    /** Remove the last token — the usual fix for a wrongly recognised sign. */
    undo() {
      this.tokens.pop();
    },
    /** @param {import('../lib/types').Sign} sign an alternative to use instead of the auto-added match */
    swap(sign) {
      const t = this.lastAdded && this.tokens.find((x) => x.key === this.lastAdded.key);
      if (!t || !sign) return;
      t.signId = sign.id;
      this.lastAdded = { ...this.lastAdded, sign, alternatives: this.lastAdded.alternatives.filter((s) => s !== sign).concat(this.lastAdded.sign) };
    },
    onKey(e) {
      if (e.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'Backspace' && this.tokens.length) {
        e.preventDefault();
        this.undo();
      } else if (this.lastAdded && /^[2-4]$/.test(e.key)) this.swap(this.lastAdded.alternatives[+e.key - 2]);
    },
    langTag(l = this.settings.signLang) {
      return l === 'hi' ? 'hi-IN' : 'en-IN';
    },
    speakPreview() {
      if (this.speaking) return this.$emit('stop-speaking');
      this.$emit('speak', this.text, this.langTag());
    },
    send() {
      if (this.typed.trim()) this.addTyped();
      if (!this.text) return;
      this.$emit('send', {
        text: this.text,
        lang: this.langTag(),
        alt: composeText(this.tokens, this.vocab, this.otherLang),
      });
      this.tokens = [];
      this.typed = '';
    },
  },
};
</script>
