/**
 * @typedef {{ x: number, y: number, z: number }} Pt
 * @typedef {{ landmarks: Pt[], label: string }} HandInput
 */

// Frame layout: [shape 2x63][presence 2][wrist xy 2x2]
export const SHAPE_DIM = 126;
export const STATIC_DIM = 128;
export const FRAME_DIM = 132;
export const SEQ_LEN = 10;

/**
 * Wrist-relative, hand-size-normalised landmarks; handedness-invariant.
 * @param {HandInput[]} hands
 * @returns {Float32Array}
 */
export function frameFeature(hands) {
  const out = new Float32Array(FRAME_DIM);
  const sorted = hands.slice(0, 2).sort((a, b) => a.landmarks[0].x - b.landmarks[0].x);
  sorted.forEach((h, i) => {
    const lm = h.landmarks;
    const w = lm[0];
    const mirror = h.label === 'Left' ? -1 : 1;
    const scale = Math.hypot(lm[9].x - w.x, lm[9].y - w.y, lm[9].z - w.z) || 1e-6;
    for (let j = 0; j < 21; j++) {
      const o = i * 63 + j * 3;
      out[o] = (mirror * (lm[j].x - w.x)) / scale;
      out[o + 1] = (lm[j].y - w.y) / scale;
      out[o + 2] = (lm[j].z - w.z) / scale;
    }
    out[SHAPE_DIM + i] = 2; // weighted so hand count matters
    out[STATIC_DIM + i * 2] = w.x;
    out[STATIC_DIM + i * 2 + 1] = w.y;
  });
  return out;
}

/** @param {Float32Array} f */
export function staticVector(f) {
  return Array.from(f.subarray(0, STATIC_DIM), round);
}

/**
 * Resample a clip to SEQ_LEN frames; wrist trajectory is made start-relative.
 * @param {Float32Array[]} frames
 */
export function dynamicVector(frames) {
  const first = frames.find((f) => f[SHAPE_DIM] > 0 || f[SHAPE_DIM + 1] > 0) ?? frames[0];
  const v = [];
  for (let i = 0; i < SEQ_LEN; i++) {
    const f = frames[Math.round((i * (frames.length - 1)) / (SEQ_LEN - 1))];
    for (let d = 0; d < STATIC_DIM; d++) v.push(round(f[d]));
    for (let d = STATIC_DIM; d < FRAME_DIM; d++) v.push(round((f[d] - first[d]) * 4));
  }
  return v;
}

export function rmsDistance(a, b) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s / n);
}

/** Mean wrist speed in frame-widths per second between two frames. */
export function wristSpeed(a, b, dt) {
  let s = 0;
  let n = 0;
  for (let i = 0; i < 2; i++) {
    if (a[SHAPE_DIM + i] > 0 && b[SHAPE_DIM + i] > 0) {
      s += Math.hypot(a[STATIC_DIM + i * 2] - b[STATIC_DIM + i * 2], a[STATIC_DIM + i * 2 + 1] - b[STATIC_DIM + i * 2 + 1]);
      n++;
    }
  }
  return n && dt > 0 ? s / n / dt : 0;
}

function round(x) {
  return Math.round(x * 100) / 100;
}
