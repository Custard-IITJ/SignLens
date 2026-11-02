<template>
  <div class="stage">
    <video ref="video" playsinline muted aria-label="Camera preview" />
    <canvas ref="canvas" aria-hidden="true" />
    <template v-if="running">
      <div class="guide" aria-hidden="true" />
      <div class="stage-top">
        <span class="badge on"><i /> Live · {{ fps }} fps</span>
        <button class="btn small glass" @click="camera.stop()">■ Stop camera</button>
      </div>
      <slot />
    </template>
    <div v-else class="stage-empty">
      <div v-if="status === 'loading'" class="spinner" />
      <template v-else>
        <div class="big" aria-hidden="true">📷</div>
        <p>{{ messages[status] }}</p>
        <button class="btn primary lg" @click="start">▶ Start camera</button>
      </template>
      <p v-if="status === 'loading'">{{ messages.loading }}</p>
      <p class="small muted">Video stays on this device — only hand landmarks are analysed.</p>
    </div>
  </div>
</template>

<script>
import { HandCamera } from '../lib/camera';

const MESSAGES = {
  idle: 'Turn on the camera to start signing',
  loading: 'Loading hand tracker…',
  running: 'Camera on',
  denied: 'Camera permission denied. Allow camera access in your browser’s site settings, then try again.',
  nocamera: 'No camera was found on this device.',
  error: 'Could not start the camera or hand tracker. Check your connection (the model downloads once) and try again.',
};

/** Camera preview + hand-landmark overlay. Emits detected hands every frame. */
export default {
  name: 'CameraStage',
  emits: ['hands', 'status'],
  data() {
    return { status: 'idle', fps: 0, messages: MESSAGES };
  },
  computed: {
    running() {
      return this.status === 'running';
    },
  },
  watch: {
    status(s) {
      this.$emit('status', s);
    },
  },
  created() {
    this.camera = new HandCamera({
      onHands: (hands, t) => this.$emit('hands', hands, t),
      onStatus: (s) => (this.status = s),
      onFps: (fps) => (this.fps = fps),
    });
  },
  beforeUnmount() {
    this.camera.stop();
  },
  methods: {
    start() {
      this.camera.start(this.$refs.video, this.$refs.canvas);
    },
  },
};
</script>
