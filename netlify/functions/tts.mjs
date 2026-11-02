import { synthesize } from '../../server/elevenlabs.mjs';

export default async (req) => {
  const { status, body, audio } = await synthesize({
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    modelId: process.env.ELEVENLABS_TTS_MODEL,
    method: req.method,
    origin: req.headers.get('origin'),
    host: req.headers.get('host'),
    json: await req.json().catch(() => null),
  });
  if (audio) return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/tts' };
