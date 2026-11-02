<template>
  <div class="about">
    <div class="page-head">
      <h1>About SignLens</h1>
      <p class="muted">
        SignLens is an experimental assistant for conversations between Indian Sign Language (ISL) signers and speakers of English or
        Hindi. It is not a substitute for a qualified ISL interpreter. These are the references, data and services it is built on.
      </p>
    </div>

    <section class="panel">
      <h2>Indian Sign Language references</h2>
      <ul class="refs">
        <li>
          <a href="https://divyangjan.depwd.gov.in/islrtc/" target="_blank" rel="noreferrer">ISLRTC Indian Sign Language Dictionary</a>
          — Indian Sign Language Research and Training Centre, Department of Empowerment of Persons with Disabilities, Government of
          India. Primary reference for the {{ vocab.signs.length }} candidate signs in vocabulary v{{ vocab.version }}.
        </li>
        <li>
          <a href="https://islrtc.nic.in/" target="_blank" rel="noreferrer">ISLRTC website</a> — official information on ISL and its
          standardisation.
        </li>
        <li>
          <a :href="CHANNEL" target="_blank" rel="noreferrer">ISLRTC YouTube channel</a> — source of every reference video shown on
          the Signs page ({{ videos.length }} videos covering {{ covered }} of {{ vocab.signs.length }} signs). Videos are embedded,
          not copied, and remain the property of ISLRTC.
        </li>
      </ul>

      <details class="ref-list">
        <summary>Reference video for each sign</summary>
        <table>
          <thead>
            <tr><th scope="col">Sign</th><th scope="col">ISLRTC video</th></tr>
          </thead>
          <tbody>
            <tr v-for="v in videos" :key="v.youtube">
              <td>{{ v.signs.join(', ') }}</td>
              <td><a :href="`https://www.youtube.com/watch?v=${v.youtube}`" target="_blank" rel="noreferrer">{{ v.title }}</a></td>
            </tr>
          </tbody>
        </table>
        <p v-if="missing.length" class="muted small">No verified video yet: {{ missing.join(', ') }}.</p>
      </details>
    </section>

    <section class="panel">
      <h2>Technology and services</h2>
      <ul class="refs">
        <li>
          <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker" target="_blank" rel="noreferrer">MediaPipe Hand Landmarker</a>
          (Google, Apache 2.0) — detects 21 hand landmarks per hand on your device; video never leaves the browser.
        </li>
        <li>
          <a href="https://elevenlabs.io/docs/capabilities/speech-to-text" target="_blank" rel="noreferrer">ElevenLabs Scribe v2 Realtime</a>
          — Hindi speech-to-text captions.
        </li>
        <li>
          <a href="https://elevenlabs.io/docs/capabilities/text-to-speech" target="_blank" rel="noreferrer">ElevenLabs Multilingual v2</a>
          — Hindi text-to-speech.
        </li>
        <li>
          <a href="https://developer.mozilla.org/docs/Web/API/Web_Speech_API" target="_blank" rel="noreferrer">Web Speech API</a>
          — the browser’s own English speech-to-text and text-to-speech (and Hindi, when chosen in Settings).
        </li>
        <li>
          <a href="https://support.google.com/youtube/answer/171780" target="_blank" rel="noreferrer">YouTube embedded player</a>
          (privacy-enhanced mode) — plays the reference videos.
        </li>
        <li>
          <a href="https://vuejs.org/" target="_blank" rel="noreferrer">Vue 3</a> and <a href="https://vite.dev/" target="_blank" rel="noreferrer">Vite</a>
          — application framework and build tool.
        </li>
        <li>
          <a href="https://fonts.google.com/specimen/Inter" target="_blank" rel="noreferrer">Inter</a> and
          <a href="https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari" target="_blank" rel="noreferrer">Noto Sans Devanagari</a>
          (SIL Open Font License) via Google Fonts.
        </li>
      </ul>
    </section>

    <p class="hint">
      SignLens is not affiliated with or endorsed by ISLRTC. Signs have regional variants and every vocabulary entry is pending review
      by an ISL-fluent reviewer.
    </p>
  </div>
</template>

<script>
import references from '../data/isl-references.json';

const CHANNEL = 'https://www.youtube.com/channel/UC3AcGIlqVI4nJWCwHgHFXtg';

export default {
  name: 'About',
  props: {
    vocab: { type: Object, required: true },
  },
  data() {
    return { CHANNEL };
  },
  computed: {
    /** One row per video; the A–Z fingerspelling video serves all 26 letters. */
    videos() {
      const byId = new Map();
      for (const sign of this.vocab.signs) {
        const r = references[sign.id];
        if (!r) continue;
        if (!byId.has(r.youtube)) byId.set(r.youtube, { youtube: r.youtube, title: r.title, signs: [] });
        byId.get(r.youtube).signs.push(sign.en);
      }
      return [...byId.values()];
    },
    covered() {
      return this.vocab.signs.filter((s) => references[s.id]).length;
    },
    missing() {
      return this.vocab.signs.filter((s) => !references[s.id]).map((s) => s.en);
    },
  },
};
</script>
