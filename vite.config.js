import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { mintScribeToken, synthesize } from './server/elevenlabs.mjs';

const DATA_FILE = fileURLToPath(new URL('./src/data/isl-data.json', import.meta.url));
const EMPTY = { settings: {}, samples: [] };

/** Serves src/data/isl-data.json at /api/isl-data: GET reads it, PUT replaces it. */
function islDataFile() {
  const handler = async (req, res) => {
    try {
      if (req.method === 'GET') {
        let body;
        try {
          body = await readFile(DATA_FILE, 'utf8');
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
          body = JSON.stringify(EMPTY);
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        return res.end(body);
      }
      if (req.method === 'PUT') {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object' || !Array.isArray(data.samples)) throw new Error('invalid data');
        // Write to a temp file then rename, so a crash mid-write never leaves a truncated file.
        await writeFile(DATA_FILE + '.tmp', JSON.stringify(data));
        await rename(DATA_FILE + '.tmp', DATA_FILE);
        res.statusCode = 204;
        return res.end();
      }
      res.statusCode = 405;
      res.end();
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e.message ?? e));
    }
  };
  const mount = (server) => {
    server.middlewares.use('/api/isl-data', handler);
  };
  return { name: 'isl-data-file', configureServer: mount, configurePreviewServer: mount };
}

/** Dev/preview stand-ins for netlify/functions/. Keys are read server-side only (no VITE_ prefix). */
function elevenLabs(env) {
  const json = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  const base = (req) => ({ apiKey: env.ELEVENLABS_API_KEY, method: req.method, origin: req.headers.origin, host: req.headers.host });
  const mount = (server) => {
    server.middlewares.use('/api/scribe-token', async (req, res) => {
      const { status, body } = await mintScribeToken(base(req));
      json(res, status, body);
    });
    server.middlewares.use('/api/tts', async (req, res) => {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // synthesize() reports the missing text
      }
      const r = await synthesize({ ...base(req), voiceId: env.ELEVENLABS_VOICE_ID, modelId: env.ELEVENLABS_TTS_MODEL, json: parsed });
      if (!r.audio) return json(res, r.status, r.body);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.end(Buffer.from(r.audio));
    });
  };
  return { name: 'elevenlabs', configureServer: mount, configurePreviewServer: mount };
}

// Polling avoids a native fsevents crash seen on some macOS/Node combinations.
// The data file is ignored so saving samples doesn't trigger a reload.
export default defineConfig(({ mode }) => ({
  plugins: [vue(), islDataFile(), elevenLabs(loadEnv(mode, process.cwd(), ''))],
  server: { watch: { usePolling: true, ignored: ['**/src/data/isl-data.json*'] } },
}));
