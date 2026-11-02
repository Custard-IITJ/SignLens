import { rmsDistance } from './features';

/** Strictness 0..1 -> distance threshold. */
export function thresholdFor(strictness, kind) {
  const base = 0.2 - strictness * 0.14; // 0.2 (lenient) .. 0.06 (strict)
  return kind === 'dynamic' ? base * 1.8 : base;
}

/**
 * Nearest-neighbour over per-class best distance, with a margin test against the runner-up.
 * @param {import('./types').Sample[]} samples
 * @param {ArrayLike<number>} query
 * @param {'static'|'dynamic'} kind
 * @param {number} strictness
 * @returns {{ signId: string, dist: number, accepted: boolean, confidence: number, alternatives: string[] } | null}
 */
export function classify(samples, query, kind, strictness) {
  const best = new Map();
  for (const s of samples) {
    if (s.kind !== kind) continue;
    const d = rmsDistance(s.v, query);
    if (d < (best.get(s.signId) ?? Infinity)) best.set(s.signId, d);
  }
  const ranked = [...best.entries()].sort((a, b) => a[1] - b[1]);
  if (!ranked.length) return null;
  const [signId, dist] = ranked[0];
  const second = ranked[1]?.[1];
  const limit = thresholdFor(strictness, kind);
  const accepted = dist <= limit && (second === undefined || dist < second * 0.85);
  // Runner-ups the user can pick instead of rejecting outright.
  const alternatives = ranked.slice(1, 4).filter(([, d]) => d <= limit * 1.6).map(([id]) => id);
  return { signId, dist, accepted, confidence: Math.max(0, 1 - dist / limit / 2), alternatives };
}
