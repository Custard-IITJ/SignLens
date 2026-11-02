// Mints a single-use ElevenLabs realtime speech-to-text token, so the API key never reaches the browser.
// Shared by the Vite dev server (vite.config.js) and the Netlify Function (netlify/functions/scribe-token.mjs).

const TOKEN_URL = 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe';

/**
 * @param {{ apiKey?: string, method: string, origin?: string | null, host?: string | null }} req
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function mintScribeToken({ apiKey, method, origin, host }) {
  if (method !== 'POST') return { status: 405, body: { error: 'Use POST' } };
  // Browsers always send Origin on POST; refuse other sites' pages. (Doesn't stop scripted abuse - see README.)
  if (origin && host && new URL(origin).host !== host) return { status: 403, body: { error: 'Forbidden origin' } };
  if (!apiKey) return { status: 503, body: { error: 'ELEVENLABS_API_KEY is not set on the server' } };
  try {
    const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'xi-api-key': apiKey } });
    if (!res.ok) return { status: res.status === 401 ? 502 : res.status, body: { error: `ElevenLabs refused the token request (${res.status})` } };
    const { token } = await res.json();
    return { status: 200, body: { token } };
  } catch {
    return { status: 502, body: { error: 'Could not reach ElevenLabs' } };
  }
}
