// Runs code through Judge0 (https://judge0.com).
//
// Env:
//   JUDGE0_URL      default https://judge0-ce.p.rapidapi.com (RapidAPI).
//                   Point it at a self-hosted Judge0 to skip RapidAPI.
//   JUDGE0_API_KEY  RapidAPI key; required for the RapidAPI URL.

const DEFAULT_URL = 'https://judge0-ce.p.rapidapi.com';
const TIMEOUT_MS = 20000;

// Playground language id -> Judge0 language name pattern.
const LANGUAGE_PATTERNS = {
  python: /^Python \(3/,
  c: /^C \(GCC/,
  cpp: /^C\+\+ \(GCC/,
  java: /^Java \(/,
  javascript: /^JavaScript \(Node/,
  go: /^Go \(/,
  rust: /^Rust \(/,
  mysql: /^SQL \(/,
};

// Used only if Judge0's /languages list can't be loaded.
const FALLBACK_IDS = {
  python: 71,
  c: 50,
  cpp: 54,
  java: 62,
  javascript: 63,
  go: 60,
  rust: 73,
  mysql: 82,
};

let languageIdsPromise = null;

function baseUrl() {
  return (process.env.JUDGE0_URL || DEFAULT_URL).replace(/\/+$/, '');
}

function headers() {
  const result = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_API_KEY) {
    result['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    result['X-RapidAPI-Host'] = new URL(baseUrl()).host;
  }
  return result;
}

function isConfigured() {
  return Boolean(process.env.JUDGE0_API_KEY || process.env.JUDGE0_URL);
}

// Resolve the newest matching Judge0 language for each playground language.
async function loadLanguageIds() {
  try {
    const response = await fetch(`${baseUrl()}/languages`, {
      headers: headers(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const languages = await response.json();

    const ids = { ...FALLBACK_IDS };
    for (const [key, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      const matches = languages.filter((lang) => pattern.test(lang.name));
      if (matches.length) ids[key] = Math.max(...matches.map((lang) => lang.id));
    }
    return ids;
  } catch (error) {
    console.error('Judge0 languages lookup failed, using fallback ids:', error.message);
    languageIdsPromise = null; // retry next time
    return FALLBACK_IDS;
  }
}

function languageIds() {
  if (!languageIdsPromise) languageIdsPromise = loadLanguageIds();
  return languageIdsPromise;
}

const decode = (value) => (value ? Buffer.from(value, 'base64').toString('utf8') : '');

/**
 * Runs `code` and resolves to { status, stdout, error }.
 * status: 'ok' | 'compile-error' | 'runtime-error' | 'timeout' | 'service-error'
 */
async function runCode(language, code) {
  const ids = await languageIds();
  const languageId = ids[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const url = `${baseUrl()}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,status,message`;
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      language_id: languageId,
      source_code: Buffer.from(code, 'utf8').toString('base64'),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Judge0 submission error:', response.status, details);
    return {
      status: 'service-error',
      stdout: '',
      error: response.status === 429
        ? 'The code checker is busy (daily limit reached). Try again later.'
        : 'The code checker is unavailable right now.',
    };
  }

  const result = await response.json();
  const statusId = result.status?.id;
  const stdout = decode(result.stdout);

  // Judge0 status ids: 3 accepted, 5 time limit, 6 compile error, 7-12 runtime errors.
  if (statusId === 3) return { status: 'ok', stdout, error: '' };
  if (statusId === 5) return { status: 'timeout', stdout, error: 'Your code took too long to run.' };
  if (statusId === 6) return { status: 'compile-error', stdout, error: decode(result.compile_output) };
  if (statusId >= 7 && statusId <= 12) {
    return { status: 'runtime-error', stdout, error: decode(result.stderr) || result.status.description };
  }
  return {
    status: 'service-error',
    stdout,
    error: decode(result.message) || result.status?.description || 'Unknown error',
  };
}

module.exports = { runCode, isConfigured, SUPPORTED_LANGUAGES: Object.keys(LANGUAGE_PATTERNS) };
