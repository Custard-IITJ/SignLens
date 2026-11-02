<template>
  <div class="palette">
    <div class="palette-head">
      <input v-model="q" type="search" placeholder="Search signs (English / हिन्दी)…" aria-label="Search signs" />
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
    <div class="palette-grid">
      <button v-for="s in list" :key="s.id" class="pick" @click="$emit('pick', s)">
        <b :lang="lang">{{ word(s, lang) }}</b>
        <small :lang="lang === 'hi' ? 'en' : 'hi'">{{ word(s, lang === 'hi' ? 'en' : 'hi') }}</small>
      </button>
      <p v-if="!list.length" class="placeholder">No signs match.</p>
    </div>
  </div>
</template>

<script>
import { CATEGORY_LABELS, signWord } from '../lib/vocabulary';

/** Tap-to-add fallback for signs the camera misses (or that aren't trained yet). */
export default {
  name: 'SignPalette',
  props: {
    vocab: { type: Object, required: true },
    lang: { type: String, default: 'en' },
  },
  emits: ['pick'],
  data() {
    return { q: '', cat: 'all', labels: CATEGORY_LABELS };
  },
  computed: {
    list() {
      const q = this.q.trim().toLowerCase();
      return this.vocab.signs.filter((s) => (this.cat === 'all' || s.category === this.cat) && (s.en + ' ' + s.hi).toLowerCase().includes(q));
    },
  },
  methods: {
    word: signWord,
  },
};
</script>
