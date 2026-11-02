<template>
  <div class="teach-view">
    <div class="page-head">
      <div class="row tight">
        <h1>Teach signs</h1>
        <button v-if="lockable" class="btn ghost push" @click="$emit('lock')">🔒 Lock</button>
      </div>
      <p class="muted">
        No pre-trained ISL model ships with this app. Record landmark samples of each <em>reviewer-approved</em> sign — numbers only, no video is
        saved. Record several people, distances and lighting conditions for better recognition.
      </p>
    </div>
    <div class="teach-grid">
      <div>
        <CameraStage @hands="onHands" @status="camStatus = $event">
          <div v-if="rec.phase === 'countdown'" class="countdown" aria-hidden="true">{{ rec.n }}</div>
        </CameraStage>
        <div class="rec" role="status" aria-live="polite">
          <progress v-if="rec.phase === 'recording'" :max="1" :value="rec.progress" aria-label="Recording" />
          <span v-else-if="rec.phase === 'countdown'">Get ready… {{ rec.n }}</span>
          <span v-else-if="rec.phase === 'done'" class="ok-text">✔ Saved {{ rec.count }} sample{{ rec.count > 1 ? 's' : '' }} for “{{ sign.en }}”</span>
          <span v-else-if="rec.phase === 'failed'" class="err-text">No hand seen while recording — try again.</span>
          <span v-else class="muted">{{ cameraOn ? 'Choose a sign and press Record.' : 'Start the camera first.' }}</span>
        </div>
        <p v-if="rec.phase === 'done' && rec.seenHands !== sign.hands" class="hint">
          ⚠ “{{ sign.en }}” is listed as a {{ sign.hands }}-hand sign but {{ rec.seenHands }} hand{{ rec.seenHands > 1 ? 's were' : ' was' }} seen.
          Check the pose, or delete and re-record.
        </p>
      </div>

      <section class="panel">
        <label class="field">Sign
          <select v-model="id">
            <optgroup v-for="c in vocab.categories" :key="c" :label="labels[c] ?? c">
              <option v-for="s in vocab.signs.filter((x) => x.category === c)" :key="s.id" :value="s.id">
                {{ s.en }} · {{ s.hi }} — {{ count(s.id) }} samples
              </option>
            </optgroup>
          </select>
        </label>
        <div class="tags">
          <span class="tag">{{ sign.type === 'static' ? '✋ static — hold the pose' : '👋 dynamic — perform the motion' }}</span>
          <span class="tag">{{ sign.hands }} hand{{ sign.hands > 1 ? 's' : '' }}</span>
          <span class="tag">class #{{ sign.classId }}</span>
          <a v-if="sign.referenceUrl" class="tag" :href="sign.referenceUrl" target="_blank" rel="noreferrer">ISLRTC reference ↗</a>
        </div>
        <div class="row">
          <button class="btn primary" :disabled="!cameraOn || busy" @click="startRecording">
            ⏺ Record {{ sign.type === 'static' ? '20 frames' : '1 clip' }}
          </button>
          <button class="btn" :disabled="!count(id)" @click="$emit('clear-sign', id)">Delete “{{ sign.en }}” samples</button>
        </div>
        <p v-if="storageError && fileWritable" class="err-text">Could not read or write src/data/isl-data.json — make sure the app is running via <code>npm run dev</code>, and export your samples to keep them.</p>
        <p v-else-if="storageError" class="err-text">Could not load the built-in samples, or this browser’s storage is full or unavailable — export your samples to keep them.</p>
        <p v-if="!fileWritable" class="muted small">Samples you record here are kept in this browser only, on top of the built-in ones.</p>

        <h3>Progress</h3>
        <p class="muted small">{{ trained }} of {{ vocab.signs.length }} signs have samples.</p>
        <div class="coverage">
          <button
            v-for="s in vocab.signs"
            :key="s.id"
            :class="['cov', { has: count(s.id), sel: s.id === id }]"
            :title="`${s.en}: ${count(s.id)} samples`"
            @click="id = s.id"
          >{{ s.en }}</button>
        </div>

        <h3>Samples file</h3>
        <div class="row">
          <button class="btn" :disabled="!samples.length" @click="exportJson">⬇ Export</button>
          <button class="btn" @click="$refs.file.click()">⬆ Import</button>
          <input ref="file" type="file" accept="application/json" hidden @change="importJson($event.target.files?.[0]); $event.target.value = ''" />
          <button class="btn danger" :disabled="!samples.length" @click="clearAll">Delete all ({{ samples.length }})</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { dynamicVector, frameFeature, SHAPE_DIM, staticVector } from '../lib/features';
import { FILE_WRITABLE } from '../lib/storage';
import { TEACH_LOCK } from '../lib/teachLock';
import { CATEGORY_LABELS } from '../lib/vocabulary';
import CameraStage from './CameraStage.vue';

/**
 * Recorder state:
 * { phase: 'idle' } | { phase: 'countdown', n } | { phase: 'recording', progress } | { phase: 'done', count, seenHands } | { phase: 'failed' }
 */
export default {
  name: 'TeachView',
  components: { CameraStage },
  props: {
    vocab: { type: Object, required: true },
    samples: { type: Array, required: true },
    storageError: { type: Boolean, default: false },
  },
  emits: ['add-samples', 'clear-sign', 'clear-all', 'replace-samples', 'camera-change', 'lock'],
  data() {
    return { id: this.vocab.signs[0]?.id, rec: { phase: 'idle' }, camStatus: 'idle', labels: CATEGORY_LABELS, fileWritable: FILE_WRITABLE, lockable: TEACH_LOCK === 'locked' };
  },
  computed: {
    sign() {
      return this.vocab.byId.get(this.id);
    },
    cameraOn() {
      return this.camStatus === 'running';
    },
    busy() {
      return this.rec.phase === 'countdown' || this.rec.phase === 'recording';
    },
    counts() {
      const m = new Map();
      this.samples.forEach((s) => m.set(s.signId, (m.get(s.signId) ?? 0) + 1));
      return m;
    },
    trained() {
      return this.counts.size;
    },
  },
  watch: {
    cameraOn(on) {
      this.$emit('camera-change', on);
    },
  },
  created() {
    // Recording buffers stay outside `data` so Vue never proxies per-frame Float32Arrays.
    this.recording = null;
    this.timers = [];
  },
  beforeUnmount() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.$emit('camera-change', false);
  },
  methods: {
    count(sid) {
      return this.counts.get(sid) ?? 0;
    },
    onHands(hands, t) {
      const r = this.recording;
      if (!r || !hands.length || t < r.startAt) return;
      const f = frameFeature(hands);
      if (r.kind === 'static') {
        if (t - r.lastAt < 90) return;
        r.lastAt = t;
        r.frames.push(f);
        this.rec = { phase: 'recording', progress: r.frames.length / 20 };
        if (r.frames.length >= 20) this.finishRecording();
      } else {
        r.frames.push(f);
        const p = (t - r.startAt) / 1800;
        this.rec = { phase: 'recording', progress: Math.min(1, p) };
        if (p >= 1) this.finishRecording();
      }
    },
    finishRecording() {
      const r = this.recording;
      this.recording = null;
      if (!r) return;
      // Most frequent hand count across the take, to compare against the manifest's `hands`.
      const tally = [0, 0, 0];
      r.frames.forEach((f) => tally[(f[SHAPE_DIM] > 0) + (f[SHAPE_DIM + 1] > 0)]++);
      const seenHands = tally[2] > tally[1] ? 2 : 1;
      if (r.kind === 'static') {
        this.$emit('add-samples', r.frames.map((f) => ({ signId: r.signId, kind: 'static', v: staticVector(f) })));
        this.rec = { phase: 'done', count: r.frames.length, seenHands };
      } else if (r.frames.length >= 8) {
        this.$emit('add-samples', [{ signId: r.signId, kind: 'dynamic', v: dynamicVector(r.frames) }]);
        this.rec = { phase: 'done', count: 1, seenHands };
      } else this.rec = { phase: 'failed' };
    },
    startRecording() {
      const sign = this.sign;
      this.timers.forEach((t) => window.clearTimeout(t));
      this.timers = [];
      [3, 2, 1].forEach((n, i) => this.timers.push(window.setTimeout(() => (this.rec = { phase: 'countdown', n }), i * 1000)));
      this.timers.push(
        window.setTimeout(() => {
          this.recording = { signId: sign.id, kind: sign.type, frames: [], startAt: performance.now(), lastAt: 0 };
          this.rec = { phase: 'recording', progress: 0 };
        }, 3000),
        // abandon if no hand shows up
        window.setTimeout(() => {
          if (this.recording && this.recording.frames.length === 0) {
            this.recording = null;
            this.rec = { phase: 'failed' };
          }
        }, 9000),
      );
    },
    exportJson() {
      const blob = new Blob([JSON.stringify({ vocabularyVersion: this.vocab.version, samples: this.samples })], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'isl-landmark-samples.json' });
      a.click();
      URL.revokeObjectURL(a.href);
    },
    async importJson(f) {
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!Array.isArray(data.samples)) throw new Error('no samples');
        // Drop samples for signs that aren't in this vocabulary.
        const known = data.samples.filter((s) => this.vocab.byId.has(s.signId) && Array.isArray(s.v));
        this.$emit('replace-samples', [...this.samples, ...known]);
        if (known.length < data.samples.length) alert(`${data.samples.length - known.length} samples were skipped (unknown signs).`);
      } catch {
        alert('That file is not a valid sample export.');
      }
    },
    clearAll() {
      if (confirm('Delete all recorded samples?')) this.$emit('clear-all');
    },
  },
};
</script>
