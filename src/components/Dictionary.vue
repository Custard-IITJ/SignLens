<template>
  <div>
    <div class="page-head">
      <h1>Sign dictionary</h1>
      <p class="muted">
        {{ vocab.signs.length }} candidate signs from vocabulary v{{ vocab.version }}. Check each in the official
        <a href="https://divyangjan.depwd.gov.in/islrtc/" target="_blank" rel="noreferrer">ISLRTC dictionary</a> and have an ISL-fluent reviewer
        approve it before use. Regional variants exist.
      </p>
    </div>
    <div class="row">
      <input v-model="q" type="search" placeholder="Search English or हिन्दी…" aria-label="Search signs" />
    </div>
    <div class="chips" role="tablist" aria-label="Category">
      <button
        v-for="c in ['all', ...vocab.categories]"
        :key="c"
        role="tab"
        :aria-selected="cat === c"
        :class="{ active: cat === c }"
        @click="cat = c"
      >{{ c === 'all' ? 'All' : labels[c] ?? c }}</button>
    </div>
    <div class="grid">
      <article v-for="s in list" :key="s.id" class="sign">
        <header>
          <h3>{{ s.en }}</h3>
          <span lang="hi" class="hi">{{ s.hi }}</span>
        </header>
        <div class="tags">
          <span class="tag">{{ s.type === 'static' ? '✋ static' : '👋 dynamic' }}</span>
          <span class="tag">{{ s.hands }} hand{{ s.hands > 1 ? 's' : '' }}</span>
          <span class="tag muted-tag">{{ labels[s.category] ?? s.category }}</span>
        </div>
        <footer>
          <span :class="['state', { trained: counts.get(s.id) }]">{{ counts.get(s.id) ? `● ${counts.get(s.id)} samples` : '○ not trained' }}</span>
          <span class="state">{{ s.reviewStatus === 'approved' ? '✔ reviewed' : '⏳ review pending' }}</span>
        </footer>
        <div class="row tight">
          <button class="btn small" :aria-label="`Say ${s.en} in English`" @click="$emit('speak', signWord(s, 'en'), 'en-IN')">🔊 EN</button>
          <button class="btn small" :aria-label="`Say ${s.hi} in Hindi`" @click="$emit('speak', signWord(s, 'hi'), 'hi-IN')">🔊 हिं</button>
        </div>
      </article>
      <p v-if="!list.length" class="placeholder">No signs match.</p>
    </div>
  </div>
</template>

<script>
import { CATEGORY_LABELS, signWord } from '../lib/vocabulary';

export default {
  name: 'Dictionary',
  props: {
    vocab: { type: Object, required: true },
    samples: { type: Array, required: true },
  },
  emits: ['speak'],
  data() {
    return { q: '', cat: 'all', labels: CATEGORY_LABELS };
  },
  computed: {
    counts() {
      const m = new Map();
      this.samples.forEach((s) => m.set(s.signId, (m.get(s.signId) ?? 0) + 1));
      return m;
    },
    list() {
      const q = this.q.trim().toLowerCase();
      return this.vocab.signs.filter((s) => (this.cat === 'all' || s.category === this.cat) && (s.en + ' ' + s.hi).toLowerCase().includes(q));
    },
  },
  methods: {
    signWord,
  },
};
</script>
