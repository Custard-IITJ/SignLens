// Server-side ElevenLabs calls, so the API key never reaches the browser.
// Shared by the Vite dev server (vite.config.js) and the Netlify Functions (netlify/functions/).

const API = 'https://api.elevenlabs.io/v1';
// Any voice can speak Hindi with the multilingual model; override with ELEVENLABS_VOICE_ID / ELEVENLABS_TTS_MODEL.
const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL = 'eleven_multilingual_v2';
// Caps the credits one request can spend; signed messages and captions are short.
const MAX_TTS_CHARS = 600;

/**
 * Checks shared by every endpoint. Browsers always send Origin on POST, so other sites' pages are refused.
 * (Scripts can still forge it - set a usage limit on the key; see README.)
 * @returns {{ status: number, body: object } | null} an error response, or null to continue
 */
function guard({ apiKey, method, origin, host }) {
  if (method !== 'POST') return { status: 405, body: { error: 'Use POST' } };
  if (origin && host && new URL(origin).host !== host) return { status: 403, body: { error: 'Forbidden origin' } };
  if (!apiKey) return { status: 503, body: { error: 'ELEVENLABS_API_KEY is not set on the server' } };
  return null;
}

/**
 * Mints a single-use realtime speech-to-text token (15 min, one connection).
 * @param {{ apiKey?: string, method: string, origin?: string | null, host?: string | null }} req
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function mintScribeToken(req) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const res = await fetch(`${API}/single-use-token/realtime_scribe`, { method: 'POST', headers: { 'xi-api-key': req.apiKey } });
    if (!res.ok) return { status: res.status === 401 ? 502 : res.status, body: { error: `ElevenLabs refused the token request (${res.status})` } };
    const { token } = await res.json();
    return { status: 200, body: { token } };
  } catch {
    return { status: 502, body: { error: 'Could not reach ElevenLabs' } };
  }
}

/**
 * Hindi text to speech. Success returns MP3 bytes in `audio`; failures return a JSON `body`.
 * @param {{ apiKey?: string, voiceId?: string, modelId?: string, method: string, origin?: string | null, host?: string | null, json: any }} req
 * @returns {Promise<{ status: number, body?: object, audio?: ArrayBuffer }>}
 */
export async function synthesize(req) {
  const denied = guard(req);
  if (denied) return denied;
  // ElevenLabs is for Hindi only; English is spoken by the browser.
  if (req.json?.lang !== 'hi-IN') return { status: 400, body: { error: 'Only Hindi (hi-IN) is spoken by ElevenLabs' } };
  const text = typeof req.json?.text === 'string' ? req.json.text.trim() : '';
  if (!text) return { status: 400, body: { error: 'No text' } };
  if (text.length > MAX_TTS_CHARS) return { status: 413, body: { error: `Text longer than ${MAX_TTS_CHARS} characters` } };
  try {
    const res = await fetch(`${API}/text-to-speech/${req.voiceId || DEFAULT_VOICE}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': req.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      // The multilingual model detects Hindi from the text; it rejects an explicit language_code.
      body: JSON.stringify({ text, model_id: req.modelId || DEFAULT_MODEL }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { status: res.status === 401 ? 502 : res.status, body: { error: `ElevenLabs refused the speech request (${res.status})`, detail: detail.slice(0, 300) } };
    }
    return { status: 200, audio: await res.arrayBuffer() };
  } catch {
    return { status: 502, body: { error: 'Could not reach ElevenLabs' } };
  }
}
