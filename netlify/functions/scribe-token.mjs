import { mintScribeToken } from '../../server/elevenlabs.mjs';

export default async (req) => {
  const { status, body } = await mintScribeToken({
    apiKey: process.env.ELEVENLABS_API_KEY,
    method: req.method,
    origin: req.headers.get('origin'),
    host: req.headers.get('host'),
  });
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/scribe-token' };
