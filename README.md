# SignLens — ISL Communication Assistant (Hackathon MVP)

Vue 3 (Options API) + JavaScript + Vite. Implements the scope in `Scope.md` as a single two-lane conversation screen:

- **Signer lane** — camera → MediaPipe hand landmarks → on-device classifier → sign looked up in `src/data/isl-vocabulary.json` →
  English or Hindi text (the manifest's `en` / `hi`) → spoken aloud with the browser's text-to-speech. Each recognition shows the
  sign's `type`, `hands` and `reviewStatus`, a confidence meter and up to three runner-up signs to pick instead of rejecting.
  Words can also be typed.
- **Speaker lane** — speech-to-text: Web Speech API for English, ElevenLabs Scribe for Hindi (see below). Recognition pauses while the app is speaking so it doesn't
  caption its own voice. Vocabulary words heard in speech are shown as sign chips on the message.
- **Signs** (dictionary with hear-it buttons), **Teach** (record landmark samples; warns when the hand count differs from the
  manifest's `hands`), **Settings** (voice per language, rate, auto-speak, strictness, contrast).

`src/lib/vocabulary.js` validates the manifest and does all sign↔text work: `resolveSign` accepts either a `signId` (landmark
classifier) or a `classId` (output index of a future trained model). The previous UI is kept in `_vue-v1-backup/`.

## Run
    npm install
    npm run dev      # http://localhost:5173 (camera/mic need localhost or HTTPS)
    npm run build    # production bundle in dist/ (deploy over HTTPS)
    npm run preview  # serve dist/ locally, behaves like the deployed site

## Deploy (Netlify)
Push the repo to GitHub (include `src/data/isl-data.json`) and import it in Netlify — `netlify.toml` sets the build command
and `dist/` publish folder. The deployed site is read-only: every visitor gets the samples shipped in `isl-data.json`, and
anything they record on Teach stays in their own browser. To update the shared model, record with `npm run dev`, commit, push.

### Hindi speech (ElevenLabs)
Hindi uses ElevenLabs by default — Scribe realtime (`scribe_v2_realtime`) for captions and `eleven_multilingual_v2` for
speaking, so Hindi works even on devices with no Hindi voice installed. Settings can switch both back to the browser;
English always uses the browser. Speech falls back to the browser voice if ElevenLabs fails. Optional env vars:
`ELEVENLABS_VOICE_ID` (default: a premade voice) and `ELEVENLABS_TTS_MODEL`. The API key stays server-side: the page asks `/api/scribe-token`
for a single-use token (15 min, one connection) and streams 16 kHz PCM from the mic to ElevenLabs over a WebSocket.
- Local: add `ELEVENLABS_API_KEY=...` to `.env.local` (no `VITE_` prefix, so it is never bundled), restart `npm run dev`.
- Netlify: add `ELEVENLABS_API_KEY` under environment variables; `netlify/functions/` serves `/api/scribe-token` and `/api/tts`.
The endpoints reject other websites' pages (and `/api/tts` caps text at 600 characters), but anyone can still script requests to them and spend your ElevenLabs credits —
set a usage limit on the key in the ElevenLabs dashboard.

### Teach password
    npm run teach-password -- "your password"   # prints VITE_TEACH_PASSWORD_HASH=...
Add that variable in Netlify (Site configuration → Environment variables) and redeploy; for local testing put the line in
`.env.local` (git-ignored). Only the salted PBKDF2 hash ships, never the password. The same password locks Teach and Settings. A build without it disables both;
`npm run dev` without it leaves them open. The check runs in the browser, so it keeps casual visitors out rather than
being real security — on the deployed site Teach can only change the visitor's own browser data anyway.

## Browser
Chrome or Edge on desktop (Web Speech API; Hindi needs `hi-IN` support). The hand model (~8 MB) downloads from Google's CDN on first use.

## Model & data
No pre-trained ISL model is bundled. Use **Sign to Text → Teach** to record consented landmark samples per sign (landmarks only, no video),
saved to `src/data/isl-data.json` by the dev server (read-only in the built site — see Deploy); export/import as JSON. Classification: normalised landmarks → nearest-neighbour with distance
threshold, runner-up margin, 8-frame stability window, motion segmentation for dynamic signs, and confirm/reject before a word is added.
Vocabulary lives in `src/data/isl-vocabulary.json` (76 candidates — 40 words, numbers 0–9 and letters A–Z — review status `pending` until an ISL-fluent reviewer approves).

## Limitations
Experimental; not a substitute for a qualified interpreter. Accuracy targets in Scope.md §13 must be measured with signer-held-out testing.
Speech audio is typically processed remotely by the browser vendor.
