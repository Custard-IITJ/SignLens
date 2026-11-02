<template>
  <section class="lane transcript" aria-labelledby="log-h">
    <header class="lane-head">
      <h2 id="log-h">Conversation</h2>
      <div class="row tight">
        <button class="btn small" :disabled="!entries.length" @click="exportTxt">⬇ Export</button>
        <button class="btn small ghost" :disabled="!entries.length" @click="$emit('clear')">Clear</button>
      </div>
    </header>
    <div class="msgs" role="log" aria-live="polite">
      <p v-if="!entries.length" class="placeholder center">
        Signed messages (spoken aloud) and the other person’s speech (captioned) appear here in order.<br />Nothing is saved when you close the page.
      </p>
      <article v-for="e in entries" :key="e.id" :class="['msg', e.source]">
        <div class="who">
          <span>{{ e.source === 'sign' ? '🤟 Signer' : '🎙️ Speaker' }} · {{ e.lang === 'hi-IN' ? 'हिन्दी' : 'English' }}</span>
          <time>{{ new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</time>
        </div>
        <p :lang="e.lang.slice(0, 2)" :style="{ fontSize: settings.textSize + 'px' }">{{ e.text }}</p>
        <p v-if="e.alt && settings.showHindi && e.alt !== e.text" class="alt" :lang="e.lang === 'hi-IN' ? 'en' : 'hi'">{{ e.alt }}</p>
        <div v-if="e.signIds?.length" class="sign-hits" aria-label="Signs for words in this message">
          <span class="muted small">Signs:</span>
          <span v-for="id in e.signIds" :key="id" class="hit" :title="hitTitle(id)">{{ vocab.byId.get(id)?.en }}</span>
        </div>
        <button
          v-if="e.source === 'sign'"
          class="replay"
          :aria-label="`Speak again: ${e.text}`"
          title="Speak again"
          @click="$emit('speak', e.text, e.lang)"
        >🔊</button>
      </article>
      <div ref="end" />
    </div>
  </section>
</template>

<script>
import { CATEGORY_LABELS } from '../lib/vocabulary';

export default {
  name: 'Transcript',
  props: {
    entries: { type: Array, required: true },
    settings: { type: Object, required: true },
    vocab: { type: Object, required: true },
  },
  emits: ['clear', 'speak'],
  watch: {
    'entries.length': {
      handler() {
        this.$refs.end?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
      flush: 'post',
    },
  },
  methods: {
    hitTitle(id) {
      const s = this.vocab.byId.get(id);
      return s ? `${s.en} · ${s.hi} — ${CATEGORY_LABELS[s.category] ?? s.category}, ${s.type}, ${s.hands} hand(s)` : '';
    },
    exportTxt() {
      const body = this.entries
        .map((e) => `[${new Date(e.time).toLocaleTimeString()}] ${e.source === 'sign' ? 'SIGN' : 'SPEECH'} (${e.lang}): ${e.text}`)
        .join('\n');
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' })),
        download: 'conversation.txt',
      });
      a.click();
      URL.revokeObjectURL(a.href);
    },
  },
};
</script>
