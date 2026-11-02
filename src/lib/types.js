/**
 * @typedef {Object} Sign
 * @property {string} id
 * @property {string} category
 * @property {string} en
 * @property {string} hi
 * @property {'static'|'dynamic'} type
 * @property {number} hands
 * @property {number} classId
 * @property {'pending'|'approved'} reviewStatus
 * @property {string|null} datasetVersion
 * @property {string} referenceUrl
 * @property {string} notes
 */

/**
 * @typedef {Object} Sample
 * @property {string} signId
 * @property {'static'|'dynamic'} kind
 * @property {number[]} v
 */

/**
 * One word in the sentence being built: a recognised/picked sign, or a typed word.
 * @typedef {Object} Token
 * @property {number} key
 * @property {string} [signId]
 * @property {string} [text]
 */

/**
 * @typedef {Object} Entry
 * @property {number} id
 * @property {'sign'|'speech'} source
 * @property {string} text text in `lang` (what was spoken aloud / heard)
 * @property {string} lang BCP-47, 'en-IN' | 'hi-IN'
 * @property {string} [alt] sign messages: the same sentence in the other language
 * @property {string[]} [signIds] speech messages: vocabulary signs mentioned
 * @property {number} time
 */

/**
 * @typedef {Object} Settings
 * @property {number} textSize
 * @property {'en-IN'|'hi-IN'} captionLang
 * @property {number} strictness
 * @property {boolean} highContrast
 * @property {'system'|'light'|'dark'} theme colour scheme; 'system' follows the OS
 * @property {boolean} showHindi
 * @property {'en'|'hi'} signLang language signed sentences are translated into and spoken in
 * @property {boolean} autoSpeak speak signed messages aloud when sent
 * @property {number} voiceRate
 * @property {string} voiceEn preferred voiceURI for en-IN ('' = automatic)
 * @property {string} voiceHi preferred voiceURI for hi-IN ('' = automatic)
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  textSize: 28,
  captionLang: 'en-IN',
  strictness: 0.5,
  highContrast: false,
  theme: 'system',
  showHindi: true,
  signLang: 'en',
  autoSpeak: true,
  voiceRate: 1,
  voiceEn: '',
  voiceHi: '',
};
