# SignLens — ISL Communication Assistant (Hackathon MVP)

Vue 3 (Options API) + JavaScript + Vite. Implements the scope in `Scope.md` as a single two-lane conversation screen:

- **Signer lane** — camera → MediaPipe hand landmarks → on-device classifier → sign looked up in `src/data/isl-vocabulary.json` →
  English or Hindi text (the manifest's `en` / `hi`) → spoken aloud with the browser's text-to-speech. Each recognition shows the
  sign's `type`, `hands` and `reviewStatus`, a confidence meter and up to three runner-up signs to pick instead of rejecting.
  Signs can also be tapped from a palette grouped by `category`, and words typed.
- **Speaker lane** — Web Speech API speech-to-text (en-IN / hi-IN). Recognition pauses while the app is speaking so it doesn't
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

### Teach password
    npm run teach-password -- "your password"   # prints VITE_TEACH_PASSWORD_HASH=...
Add that variable in Netlify (Site configuration → Environment variables) and redeploy; for local testing put the line in
`.env.local` (git-ignored). Only the salted PBKDF2 hash ships, never the password. A build without it disables Teach;
`npm run dev` without it leaves Teach open. The check runs in the browser, so it keeps casual visitors out rather than
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
