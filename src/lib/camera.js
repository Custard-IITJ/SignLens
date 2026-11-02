import { DrawingUtils, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

/** @typedef {'idle'|'loading'|'running'|'denied'|'nocamera'|'error'} CamStatus */

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let landmarkerPromise = null;
function loadLandmarker() {
  landmarkerPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    const make = (delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    try {
      return await make('GPU');
    } catch {
      return make('CPU');
    }
  })();
  landmarkerPromise.catch(() => (landmarkerPromise = null));
  return landmarkerPromise;
}

/** Camera + MediaPipe hand tracking. Frames never leave the browser. */
export class HandCamera {
  /**
   * @param {{
   *   onHands: (hands: import('./features').HandInput[], t: number) => void,
   *   onStatus: (s: CamStatus) => void,
   *   onFps: (fps: number) => void,
   * }} callbacks
   */
  constructor({ onHands, onStatus, onFps }) {
    this.onHands = onHands;
    this.onStatus = onStatus;
    this.onFps = onFps;
    this.raf = 0;
    this.stream = null;
    this.token = 0;
    this.video = null;
    this.canvas = null;
  }

  stop() {
    this.token++;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    const c = this.canvas;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    this.onStatus('idle');
    this.onFps(0);
  }

  /**
   * @param {HTMLVideoElement} video
   * @param {HTMLCanvasElement} canvas
   */
  async start(video, canvas) {
    const token = ++this.token;
    this.video = video;
    this.canvas = canvas;
    this.onStatus('loading');
    try {
      const [lm, stream] = await Promise.all([
        loadLandmarker(),
        navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540, facingMode: 'user' }, audio: false }),
      ]);
      if (token !== this.token) return stream.getTracks().forEach((t) => t.stop());
      this.stream = stream;
      video.srcObject = stream;
      await video.play();
      this.onStatus('running');
      const ctx = canvas.getContext('2d');
      const draw = new DrawingUtils(ctx);
      let lastVideoTime = -1;
      let frames = 0;
      let mark = performance.now();
      const loop = () => {
        if (token !== this.token) return;
        this.raf = requestAnimationFrame(loop);
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;
        const now = performance.now();
        const res = lm.detectForVideo(video, now);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        res.landmarks.forEach((pts) => {
          draw.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#2dd4bf', lineWidth: 4 });
          draw.drawLandmarks(pts, { color: '#fbbf24', fillColor: '#0f172a', lineWidth: 2, radius: 4 });
        });
        this.onHands(
          res.landmarks.map((landmarks, i) => ({ landmarks, label: res.handedness[i]?.[0]?.categoryName ?? 'Right' })),
          now,
        );
        frames++;
        if (now - mark > 1000) {
          this.onFps(Math.round((frames * 1000) / (now - mark)));
          frames = 0;
          mark = now;
        }
      };
      loop();
    } catch (e) {
      if (token !== this.token) return;
      const name = e?.name;
      this.onStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'nocamera' : 'error');
    }
  }
}
