/**
 * Vocabulary manifest (src/data/isl-vocabulary.json) → indexes and sign↔text translation.
 *
 * Manifest format: { version: string, signs: Sign[] } — see Sign in ./types.
 * Recogniser outputs are resolved through here, either by `signId` (landmark classifier)
 * or by `classId` (index of a future trained model's output layer).
 */

/** @typedef {'en'|'hi'} TextLang */

export const CATEGORY_LABELS = {
  greetings: 'Greetings', courtesy: 'Courtesy', needs: 'Needs', people: 'People', actions: 'Actions',
  feelings: 'Health & feelings', communication: 'Communication', daily: 'Daily life',
  numbers: 'Numbers', alphabet: 'Alphabet',
};

/** Fingerspelled letters aren't looked up in speech: "A" and "I" would match the words "a" and "I" everywhere. */
const NOT_SPOKEN = new Set(['alphabet']);

const REQUIRED = ['id', 'category', 'en', 'hi', 'type', 'hands', 'classId'];

/** @param {any} s */
function invalidReason(s) {
  const missing = REQUIRED.filter((k) => s?.[k] === undefined || s[k] === '');
  if (missing.length) return `missing ${missing.join(', ')}`;
  if (s.type !== 'static' && s.type !== 'dynamic') return `type must be static|dynamic`;
  if (s.hands !== 1 && s.hands !== 2) return `hands must be 1 or 2`;
  if (!Number.isInteger(s.classId) || s.classId < 0) return `classId must be a non-negative integer`;
  return null;
}

/**
 * Validates the manifest; malformed or duplicate entries are dropped (and logged) instead of crashing the app.
 * @param {{ version?: string, signs?: any[] }} json
 */
export function loadVocabulary(json) {
  const byId = new Map();
  const byClassId = new Map();
  /** @type {import('./types').Sign[]} */
  const signs = [];
  for (const s of json?.signs ?? []) {
    const why = invalidReason(s) ?? (byId.has(s.id) ? 'duplicate id' : byClassId.has(s.classId) ? 'duplicate classId' : null);
    if (why) {
      console.warn(`[vocabulary] skipped ${s?.id ?? '(no id)'}: ${why}`);
      continue;
    }
    const sign = Object.freeze({ reviewStatus: 'pending', datasetVersion: null, referenceUrl: '', notes: '', ...s });
    signs.push(sign);
    byId.set(sign.id, sign);
    byClassId.set(sign.classId, sign);
  }
  const categories = [...new Set(signs.map((s) => s.category))];
  return Object.freeze({ version: json?.version ?? 'unknown', signs: Object.freeze(signs), byId, byClassId, categories });
}

/** @typedef {ReturnType<typeof loadVocabulary>} Vocabulary */

/**
 * @param {Vocabulary} vocab
 * @param {{ signId?: string, classId?: number }} out recogniser output
 */
export function resolveSign(vocab, out) {
  if (out.signId !== undefined) return vocab.byId.get(out.signId);
  if (out.classId !== undefined) return vocab.byClassId.get(out.classId);
  return undefined;
}

/**
 * Word for a sign inside a sentence. Gloss alternatives like "I / me" use the first form.
 * @param {import('./types').Sign} sign
 * @param {TextLang} lang
 */
export function signWord(sign, lang) {
  return (lang === 'hi' ? sign.hi : sign.en).split(' / ')[0].trim();
}

/**
 * Turns a sequence of signed glosses (plus any typed words) into display/speakable text.
 * ISL grammar is not re-ordered: the output follows the signer's order.
 * @param {import('./types').Token[]} tokens
 * @param {Vocabulary} vocab
 * @param {TextLang} lang
 */
export function composeText(tokens, vocab, lang) {
  const words = tokens
    .map((t) => {
      const sign = t.signId ? vocab.byId.get(t.signId) : undefined;
      return sign ? { text: signWord(sign, lang), sign: true } : { text: t.text ?? '', sign: false };
    })
    .filter((w) => w.text);
  if (lang === 'hi') return words.map((w) => w.text).join(' ');
  return words
    .map((w, i) => {
      if (!w.sign) return w.text;
      if (i === 0) return w.text[0].toUpperCase() + w.text.slice(1);
      // "I" and fingerspelled letters keep their capital.
      return w.text.length === 1 ? w.text : w.text.toLowerCase();
    })
    .join(' ');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Vocabulary signs mentioned in recognised speech, in order of appearance — lets the
 * deaf participant look up the signs for what was just said.
 * @param {string} text
 * @param {Vocabulary} vocab
 */
export function findSignsInText(text, vocab) {
  const hits = [];
  for (const sign of vocab.signs) {
    if (NOT_SPOKEN.has(sign.category)) continue;
    const forms = [...sign.en.split(' / '), ...sign.hi.split(' / ')].map((f) => f.trim()).filter(Boolean);
    for (const f of forms) {
      // Word boundaries that also work for Devanagari (where \b does not); digits count as part of a word so "5" doesn't match in "15".
      const m = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}'])${escapeRe(f)}(?=$|[^\\p{L}\\p{M}\\p{N}'])`, 'iu').exec(text);
      if (m) {
        hits.push({ sign, at: m.index, len: f.length });
        break;
      }
    }
  }
  // Prefer longer phrases ("Don't understand" over "Understand") when they overlap.
  hits.sort((a, b) => a.at - b.at || b.len - a.len);
  const out = [];
  let end = -1;
  for (const h of hits) {
    if (h.at < end) continue;
    out.push(h.sign);
    end = h.at + h.len + 1;
  }
  return out;
}
