// One place to run student code.
//
// - Judge0, when JUDGE0_API_KEY or JUDGE0_URL is set (self-hosted or RapidAPI).
// - Otherwise the free public Wandbox API (no key needed).
// Force one with CODE_RUNNER=judge0 | wandbox | off.

const judge0 = require('./judge0');
const wandbox = require('./wandbox');

function activeRunner() {
  const forced = (process.env.CODE_RUNNER || '').toLowerCase();
  if (forced === 'off') return null;
  if (forced === 'wandbox') return 'wandbox';
  if (forced === 'judge0') return judge0.isConfigured() ? 'judge0' : null;
  return judge0.isConfigured() ? 'judge0' : 'wandbox';
}

const isConfigured = () => activeRunner() !== null;

async function runCode(language, code, options = {}) {
  const runner = activeRunner();
  if (runner === 'judge0') return judge0.runCode(language, code, options);
  if (runner === 'wandbox') return wandbox.runCode(language, code, options);
  return { status: 'service-error', stdout: '', error: 'Code running is turned off on this server.' };
}

// Run many inputs at once (Wandbox only: one request for all tests).
// Resolves to an array of results, or null if the caller should use runCode.
async function runBatch(language, code, inputs, options = {}) {
  if (activeRunner() !== 'wandbox') return null;
  return wandbox.runBatch(language, code, inputs, options);
}

const SUPPORTED_LANGUAGES = judge0.SUPPORTED_LANGUAGES.filter((l) => wandbox.SUPPORTED_LANGUAGES.includes(l));

module.exports = { runCode, runBatch, isConfigured, activeRunner, SUPPORTED_LANGUAGES, ping: wandbox.ping };
