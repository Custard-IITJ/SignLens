/**
 * Password gate for the Teach and Settings views (one unlock covers both). The site is static, so this is checked in the browser: it keeps casual visitors
 * out of Teach, not a determined one. Only a salted PBKDF2 hash ships in the bundle, set at build time via
 * VITE_TEACH_PASSWORD_HASH (generate it with `npm run teach-password -- <password>`).
 */
const CONFIG = (import.meta.env.VITE_TEACH_PASSWORD_HASH ?? '').trim();
const ITERATIONS = 210000;
const SESSION_KEY = 'isl.teachUnlocked';

/** 'open' = no password needed (dev without a hash), 'locked' = password required, 'unconfigured' = built without one. */
export const TEACH_LOCK = CONFIG ? 'locked' : import.meta.env.DEV ? 'open' : 'unconfigured';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16)));

/** @returns {Promise<boolean>} */
export async function checkTeachPassword(password) {
  const [salt, expected] = CONFIG.split(':');
  if (!salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: ITERATIONS }, key, 256);
  return hex(bits) === expected;
}

/** Unlocks last for the browser tab, so a refresh doesn't ask again. */
export function rememberedUnlock() {
  try {
    return CONFIG !== '' && sessionStorage.getItem(SESSION_KEY) === CONFIG;
  } catch {
    return false;
  }
}

export function rememberUnlock(on) {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, CONFIG);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode etc. - unlock just won't survive a refresh.
  }
}
