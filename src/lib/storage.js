import { DEFAULT_SETTINGS } from './types';
// Emitted as a separate asset in the build, so the shipped model doesn't bloat the JS bundle.
import shippedDataUrl from '../data/isl-data.json?url';

/**
 * Two modes:
 * - `npm run dev`: src/data/isl-data.json is read and written through the dev server (see vite.config.js).
 * - Built site (Netlify, `vite preview`): the file is shipped read-only. Each visitor's own recordings,
 *   deletions and settings live in their browser's localStorage, layered on top of the shipped samples.
 */
export const FILE_WRITABLE = import.meta.env.DEV;

const ENDPOINT = '/api/isl-data';
const SAVE_DELAY_MS = 400;

const LOCAL_KEY = 'isl.localData.v1';
// Old localStorage keys, read once in dev to migrate existing samples into the file.
const LEGACY_SAMPLES_KEY = 'isl.landmarkSamples.v1';
const LEGACY_SETTINGS_KEY = 'isl.settings.v1';

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not read isl-data.json (${res.status})`);
  return res.json();
}

/** Shipped samples in the built site; kept by identity to tell them apart from the visitor's own. */
let shipped = [];

/**
 * @returns {Promise<{ settings: import('./types').Settings, samples: import('./types').Sample[], migrated: boolean }>}
 */
export async function loadData() {
  if (!FILE_WRITABLE) {
    const data = await fetchJson(shippedDataUrl);
    shipped = Array.isArray(data.samples) ? data.samples : [];
    /** @type {{ settings?: object, added?: import('./types').Sample[], hidden?: string[] }} */
    const local = readLocal(LOCAL_KEY) ?? {};
    const hidden = new Set(local.hidden ?? []);
    const samples = [...shipped.filter((s) => !hidden.has(s.signId)), ...(local.added ?? [])];
    // Visitors start from the app defaults, not the author's own settings in the file.
    return { settings: { ...DEFAULT_SETTINGS, ...local.settings }, samples, migrated: false };
  }

  const data = await fetchJson(ENDPOINT);
  let settings = data.settings ?? {};
  let samples = Array.isArray(data.samples) ? data.samples : [];
  let migrated = false;
  if (!samples.length) {
    const legacy = readLocal(LEGACY_SAMPLES_KEY);
    if (Array.isArray(legacy) && legacy.length) {
      samples = legacy;
      settings = { ...(readLocal(LEGACY_SETTINGS_KEY) ?? {}), ...settings };
      migrated = true;
    }
  }
  return { settings: { ...DEFAULT_SETTINGS, ...settings }, samples, migrated };
}

/** Re-reads only the samples, e.g. so the conversation view picks up edits to the file. */
export async function loadSamples() {
  return (await loadData()).samples;
}

/** Stores the visitor's changes relative to the shipped samples. The Teach view only deletes whole signs. */
function saveLocal(settings, samples) {
  const shippedSet = new Set(shipped);
  const kept = new Set(samples.filter((s) => shippedSet.has(s)).map((s) => s.signId));
  const hidden = [...new Set(shipped.map((s) => s.signId))].filter((id) => !kept.has(id));
  return writeLocal(LOCAL_KEY, { settings, added: samples.filter((s) => !shippedSet.has(s)), hidden });
}

let pending = null;
let waiters = [];
let timer = 0;
let chain = Promise.resolve();

/**
 * Queues a save. Rapid calls are coalesced and writes never overlap.
 * Landmark samples only (numbers) - never video or audio.
 * @returns {Promise<boolean>} false if the data could not be saved
 */
export function saveData(settings, samples) {
  pending = { settings, samples };
  clearTimeout(timer);
  timer = setTimeout(() => {
    const data = pending;
    const batch = waiters;
    waiters = [];
    chain = chain.then(async () => {
      let ok = false;
      try {
        ok = FILE_WRITABLE
          ? (await fetch(ENDPOINT, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).ok
          : saveLocal(data.settings, data.samples);
      } catch {
        // Server unreachable - reported as a failed save.
      }
      batch.forEach((resolve) => resolve(ok));
    });
  }, SAVE_DELAY_MS);
  return new Promise((resolve) => waiters.push(resolve));
}

/** Resolves once every queued or in-flight write has finished. */
export function whenSaved() {
  return waiters.length ? new Promise((resolve) => waiters.push(resolve)) : chain;
}
