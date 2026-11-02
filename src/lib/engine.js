import { classify } from './classifier';
import { dynamicVector, frameFeature, staticVector, wristSpeed } from './features';

/**
 * @typedef {'nohand'|'ready'|'moving'|'candidate'|'uncertain'|'untrained'} Phase
 * @typedef {{ phase: Phase, signId?: string, progress: number, confidence?: number, alternatives?: string[] }} EngineState
 */

const STABLE_FRAMES = 8;
const MOVE_START = 0.45;
const MOVE_STOP = 0.2;
const MAX_CLIP_MS = 3000;

/** Runtime recognition: stability window, motion segmentation, rejection and reset-after-decision. */
export class SignEngine {
  /**
   * @param {() => import('./types').Sample[]} getSamples
   * @param {() => number} getStrictness
   * @param {(s: EngineState) => void} onState
   * @param {(f: Float32Array|null, t: number) => void} [onFrame]
   */
  constructor(getSamples, getStrictness, onState, onFrame = () => {}) {
    this.getSamples = getSamples;
    this.getStrictness = getStrictness;
    this.onState = onState;
    this.onFrame = onFrame;
    this.lastF = null;
    this.lastT = 0;
    this.speed = 0;
    this.stillFrames = 0;
    this.missing = 0;
    this.moving = false;
    this.clip = [];
    this.clipStart = 0;
    this.recent = [];
    this.stableId = null;
    this.stable = 0;
    this.locked = false;
    /** @type {EngineState} */
    this.state = { phase: 'nohand', progress: 0 };
  }

  /** Call after the user confirms or rejects a candidate. */
  release() {
    this.locked = true;
    this.stable = 0;
    this.stableId = null;
    this.emit({ phase: 'ready', progress: 0 });
  }

  /** @param {import('./features').HandInput[]} hands */
  feed(hands, t) {
    if (!hands.length) {
      this.onFrame(null, t);
      if (++this.missing > 6) {
        if (this.moving) this.finishClip();
        this.lastF = null;
        this.stable = 0;
        this.stableId = null;
        this.locked = false;
        this.recent = [];
        this.emit({ phase: 'nohand', progress: 0 });
      }
      return;
    }
    this.missing = 0;
    const f = frameFeature(hands);
    this.onFrame(f, t);
    if (this.lastF) {
      const inst = wristSpeed(this.lastF, f, (t - this.lastT) / 1000);
      this.speed = this.speed * 0.6 + inst * 0.4;
    }
    this.lastF = f;
    this.lastT = t;
    this.recent.push(f);
    if (this.recent.length > 6) this.recent.shift();

    if (!this.moving && this.speed > MOVE_START) {
      this.moving = true;
      this.clip = [...this.recent];
      this.clipStart = t;
      this.stillFrames = 0;
      this.stable = 0;
      this.stableId = null;
      if (this.state.phase !== 'candidate') this.emit({ phase: 'moving', progress: 0 });
    }
    if (this.moving) {
      this.clip.push(f);
      this.stillFrames = this.speed < MOVE_STOP ? this.stillFrames + 1 : 0;
      if (this.stillFrames >= 6 || t - this.clipStart > MAX_CLIP_MS) this.finishClip();
      return;
    }
    if (this.state.phase === 'candidate') return;
    this.classifyStatic(f);
  }

  classifyStatic(f) {
    const samples = this.getSamples();
    if (!samples.some((s) => s.kind === 'static')) return this.emit({ phase: 'untrained', progress: 0 });
    const m = classify(samples, staticVector(f), 'static', this.getStrictness());
    const id = m?.accepted ? m.signId : null;
    if (id && id === this.stableId) this.stable++;
    else {
      this.stableId = id;
      this.stable = id ? 1 : 0;
      if (this.locked && this.state.phase !== 'ready') this.locked = false;
      if (!id) this.locked = false;
    }
    if (id && this.stable >= STABLE_FRAMES && !this.locked) {
      return this.emit({ phase: 'candidate', signId: id, progress: 1, confidence: m.confidence, alternatives: m.alternatives });
    }
    if (id) return this.emit({ phase: 'ready', signId: undefined, progress: Math.min(1, this.stable / STABLE_FRAMES) });
    this.emit({ phase: m ? 'uncertain' : 'ready', progress: 0 });
  }

  finishClip() {
    const clip = this.clip;
    this.moving = false;
    this.clip = [];
    this.stillFrames = 0;
    if (clip.length < 8) return this.emit({ phase: 'ready', progress: 0 });
    const samples = this.getSamples();
    if (!samples.some((s) => s.kind === 'dynamic')) return this.emit({ phase: 'untrained', progress: 0 });
    const m = classify(samples, dynamicVector(clip), 'dynamic', this.getStrictness());
    if (m?.accepted) this.emit({ phase: 'candidate', signId: m.signId, progress: 1, confidence: m.confidence, alternatives: m.alternatives });
    else this.emit({ phase: 'uncertain', progress: 0 });
  }

  /** @param {EngineState} s */
  emit(s) {
    const p = Math.round(s.progress * 10) / 10;
    const o = this.state;
    if (o.phase === s.phase && o.signId === s.signId && o.progress === p) return;
    this.state = { ...s, progress: p };
    this.onState(this.state);
  }
}
