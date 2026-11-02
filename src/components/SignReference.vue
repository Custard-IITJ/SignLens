<template>
  <dialog ref="dialog" class="ref-dialog" :aria-labelledby="`ref-h-${sign.id}`" @close="$emit('close')" @click="onBackdrop">
    <div class="ref-body">
      <header class="ref-head">
        <div>
          <h2 :id="`ref-h-${sign.id}`">{{ sign.en }} <span lang="hi" class="hi">{{ sign.hi }}</span></h2>
          <div class="tags">
            <span class="tag">{{ sign.type === 'static' ? '✋ static' : '👋 dynamic' }}</span>
            <span class="tag">{{ sign.hands }} hand{{ sign.hands > 1 ? 's' : '' }}</span>
          </div>
        </div>
        <button class="btn ghost small" aria-label="Close" @click="close">✕</button>
      </header>

      <template v-if="reference">
        <div class="ref-video">
          <iframe
            :src="embedUrl"
            :title="`Reference video: ${sign.en} in Indian Sign Language`"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p class="muted small">
          Source: <a :href="watchUrl" target="_blank" rel="noreferrer">{{ reference.title }}</a> · {{ reference.channel }}
          <template v-if="reference.note"><br />{{ reference.note }}</template>
        </p>
      </template>
      <p v-else class="ref-empty">
        No verified reference video for this sign yet. Look it up in the
        <a :href="sign.referenceUrl || ISLRTC" target="_blank" rel="noreferrer">ISLRTC dictionary</a>.
      </p>

      <p class="hint">Regional variants exist — confirm with an ISL-fluent reviewer before relying on a sign.</p>
    </div>
  </dialog>
</template>

<script>
const ISLRTC = 'https://divyangjan.depwd.gov.in/islrtc/';

/** Modal with an embedded reference video for one sign (YouTube privacy-enhanced mode, loaded only when opened). */
export default {
  name: 'SignReference',
  props: {
    sign: { type: Object, required: true },
    /** @type {{ youtube: string, start?: number, end?: number|null, title: string, channel: string, note?: string } | undefined} */
    reference: { type: Object, default: undefined },
  },
  emits: ['close'],
  data() {
    return { ISLRTC };
  },
  computed: {
    embedUrl() {
      const r = this.reference;
      // Muted autoplay is allowed everywhere, and signs are visual anyway.
      const p = new URLSearchParams({ autoplay: '1', mute: '1', rel: '0', playsinline: '1', start: String(r.start ?? 0) });
      if (r.end) p.set('end', String(r.end));
      return `https://www.youtube-nocookie.com/embed/${r.youtube}?${p}`;
    },
    watchUrl() {
      const r = this.reference;
      return `https://www.youtube.com/watch?v=${r.youtube}${r.start ? `&t=${r.start}s` : ''}`;
    },
  },
  mounted() {
    this.$refs.dialog.showModal();
  },
  methods: {
    close() {
      this.$refs.dialog.close();
    },
    /** Clicks on the dialog element itself (not its content) are on the backdrop. */
    onBackdrop(e) {
      if (e.target === this.$refs.dialog) this.close();
    },
  },
};
</script>
