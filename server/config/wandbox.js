// Free code execution through the public Wandbox API (https://wandbox.org).
// No key needed. It is a volunteer-run service, so we keep usage polite:
// a small concurrency cap, our own time limit and capped output.
//
// Env: WANDBOX_URL (default https://wandbox.org), WANDBOX_CONCURRENCY (default 2)

const TIMEOUT_GRACE_MS = 8000; // network + compile time on top of the run limit
const LIST_TTL_MS = 24 * 60 * 60 * 1000;
// Extra time for compiling on Wandbox (measured: Java/Go ~5-10s, Rust ~10-20s).
const COMPILE_MS = { c: 6000, cpp: 8000, java: 15000, go: 15000, rust: 25000 };

const baseUrl = () => (process.env.WANDBOX_URL || 'https://wandbox.org').replace(/\/+$/, '');

// Our language id -> Wandbox language name + fallback compiler.
const LANGUAGES = {
  python: { language: 'Python', prefix: 'cpython-3', fallback: 'cpython-3.12.7' },
  c: { language: 'C', prefix: 'gcc-', fallback: 'gcc-13.2.0-c' },
  cpp: { language: 'C++', prefix: 'gcc-', fallback: 'gcc-13.2.0' },
  java: { language: 'Java', prefix: 'openjdk-', fallback: 'openjdk-jdk-22+36' },
  javascript: { language: 'JavaScript', prefix: 'nodejs-', fallback: 'nodejs-20.17.0' },
  go: { language: 'Go', prefix: 'go-', fallback: 'go-1.23.2' },
  rust: { language: 'Rust', prefix: 'rust-', fallback: 'rust-1.82.0' },
  mysql: { language: 'SQL', prefix: 'sqlite-', fallback: 'sqlite-3.46.1' },
};

// ---------- compiler list (cached) ----------
let compilers = null;
let compilersAt = 0;

async function pickCompilers() {
  if (compilers && Date.now() - compilersAt < LIST_TTL_MS) return compilers;
  const picked = Object.fromEntries(Object.entries(LANGUAGES).map(([id, l]) => [id, l.fallback]));
  try {
    const response = await fetch(`${baseUrl()}/api/list.json`, { signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const list = await response.json();
      for (const [id, l] of Object.entries(LANGUAGES)) {
        // Newest stable (not "head") compiler for the language.
        const names = list
          .filter((c) => c.language === l.language && c.name.startsWith(l.prefix) && !/head/.test(c.name))
          .map((c) => c.name);
        if (names.length) picked[id] = names[0];
      }
    }
  } catch {
    /* keep fallbacks */
  }
  compilers = picked;
  compilersAt = Date.now();
  return compilers;
}

// ---------- polite concurrency ----------
let active = 0;
const waiting = [];
async function withSlot(fn) {
  const max = Math.max(1, Number(process.env.WANDBOX_CONCURRENCY) || 2);
  if (active >= max) await new Promise((resolve) => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

// Wandbox saves Java as prog.java, so public top-level classes can't keep
// their names. Dropping "public" from them works with the source launcher.
function prepare(language, code) {
  if (language === 'java') return code.replace(/^(\s*)public\s+((?:final\s+|abstract\s+)*class\s)/gm, '$1$2');
  return code;
}

const clip = (s, n = 20000) => String(s || '').slice(0, n);

/**
 * Same contract as config/judge0.js runCode:
 * resolves to { status, stdout, error, timeMs, memoryKb }.
 */
async function runCode(language, code, options = {}) {
  if (!LANGUAGES[language]) throw new Error(`Unsupported language: ${language}`);
  const compiler = (await pickCompilers())[language];
  const limitMs = Math.round((options.cpuTimeLimit || 5) * 1000);

  return withSlot(async () => {
    let response;
    // Retry when Wandbox says "too many requests" (it limits bursts).
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        response = await fetch(`${baseUrl()}/api/compile.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ compiler, code: prepare(language, code), stdin: options.stdin || '', save: false }),
          // Run limit + time to compile (much longer for Java/Rust/Go).
          signal: AbortSignal.timeout(limitMs + TIMEOUT_GRACE_MS + (COMPILE_MS[language] || 0)),
        });
      } catch (error) {
        if (error.name === 'TimeoutError') {
          return { status: 'timeout', stdout: '', error: 'Your code took too long to run.', timeMs: null, memoryKb: null };
        }
        return { status: 'service-error', stdout: '', error: 'The code checker is unavailable right now. Try again in a minute.', timeMs: null, memoryKb: null };
      }
      if (response.status !== 429 || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt));
    }
    if (!response.ok) {
      console.error('Wandbox error:', response.status, await response.text().catch(() => ''));
      return {
        status: 'service-error',
        stdout: '',
        error: response.status === 429 ? 'The code checker is busy. Try again in a minute.' : 'The code checker is unavailable right now.',
        timeMs: null,
        memoryKb: null,
      };
    }

    const r = await response.json();
    const exit = String(r.status ?? '');
    const stdout = clip(r.program_output);
    // Wall time here includes network latency, so don't report it as runtime.
    const usage = { timeMs: null, memoryKb: null };

    // Killed by Wandbox's own limit (137 = SIGKILL), or a signal.
    if (exit === '137' || /kill/i.test(r.signal || '')) {
      return { status: 'timeout', stdout, error: 'Your code took too long to run.', ...usage };
    }
    // Compiler failed: no program ran.
    if (r.compiler_error && exit !== '0' && !r.program_output && !r.program_error) {
      return { status: 'compile-error', stdout: '', error: clip(r.compiler_error, 4000), ...usage };
    }
    if (exit !== '0' || r.signal) {
      return { status: 'runtime-error', stdout, error: clip(r.program_error || r.signal || `Exited with code ${exit}`, 4000), ...usage };
    }
    return { status: 'ok', stdout, error: '', ...usage };
  });
}

// ---------- Batch mode: compile once, run every test, ONE request ----------
//
// Wandbox rate-limits requests, so grading N tests as N requests breaks under
// load. Its bash sandbox can see every toolchain in /opt/wandbox, so we send
// the program + all inputs as files and a script that compiles once and runs
// each input with its own time limit. Results come back base64-encoded.

const T = '/opt/wandbox';

// Toolchain directory from the compiler name chosen above.
const toolDir = (language, compiler) => (language === 'c' ? compiler.replace(/-c$/, '') : compiler);

// The Java class that holds main(): the last class declared before it.
function javaMainClass(code) {
  const at = code.search(/static\s+void\s+main\s*\(/);
  if (at < 0) return 'Main';
  const names = [...code.slice(0, at).matchAll(/\bclass\s+([A-Za-z_]\w*)/g)].map((m) => m[1]);
  return names[names.length - 1] || 'Main';
}

function batchPlan(language, code, dir) {
  const bin = `${T}/${dir}/bin`;
  switch (language) {
    case 'python': return { file: 'prog.py', tool: `${bin}/python3`, compile: `${bin}/python3 -m py_compile prog.py`, run: `${bin}/python3 prog.py` };
    case 'javascript': return { file: 'prog.js', tool: `${bin}/node`, compile: `${bin}/node --check prog.js`, run: `${bin}/node prog.js` };
    case 'c': return { file: 'prog.c', tool: `${bin}/gcc`, compile: `${bin}/gcc -O2 -std=gnu17 prog.c -o prog -lm`, run: './prog' };
    case 'cpp': return { file: 'prog.cpp', tool: `${bin}/g++`, compile: `${bin}/g++ -O2 -std=gnu++17 prog.cpp -o prog -static-libstdc++ -static-libgcc`, run: './prog' };
    case 'java': return { file: 'prog.java', tool: `${bin}/javac`, compile: `${bin}/javac -encoding UTF-8 -d cls prog.java`, run: `${bin}/java -Xss64m -cp cls ${javaMainClass(code)}` };
    case 'go': return { file: 'prog.go', tool: `${bin}/go`, compile: `HOME=$PWD GOCACHE=$PWD/.gocache GOPATH=$PWD/.gopath GOFLAGS=-mod=mod ${bin}/go build -o prog prog.go`, run: './prog' };
    case 'rust': return { file: 'prog.rs', tool: `${bin}/rustc`, compile: `${bin}/rustc -O -o prog prog.rs`, run: './prog' };
    case 'mysql': return { file: 'prog.sql', tool: `${bin}/sqlite3`, compile: 'true', run: `${bin}/sqlite3 :memory: -init prog.sql .quit` };
    default: return null;
  }
}

/**
 * Run `code` once per input in a single Wandbox request.
 * Resolves to an array of { status, stdout, error } (same order as inputs),
 * or null when batch mode isn't possible (caller falls back to runCode).
 */
async function runBatch(language, code, inputs, options = {}) {
  if (!LANGUAGES[language] || !inputs.length) return null;
  const compiler = (await pickCompilers())[language];
  const plan = batchPlan(language, prepare(language, code), toolDir(language, compiler));
  if (!plan) return null;
  const limit = Math.max(1, Math.min(10, Number(options.cpuTimeLimit) || 2));

  const script = [
    'cd "$(dirname "$0")" 2>/dev/null || true',
    `[ -x "${plan.tool}" ] || { echo "@@NOTOOL"; exit 0; }`,
    `( ${plan.compile} ) > __c_out 2> __c_err || { echo "@@COMPILE $(head -c 4000 __c_err | base64 -w0)"; exit 0; }`,
    `for i in $(seq 1 ${inputs.length}); do`,
    `  timeout -s KILL ${limit}s ${plan.run} < in_$i > out_$i 2> err_$i; rc=$?`,
    '  echo "@@T $i $rc $(head -c 20000 out_$i | base64 -w0) $(head -c 4000 err_$i | base64 -w0)"',
    'done',
  ].join('\n');

  const body = {
    compiler: 'bash',
    code: script,
    codes: [{ file: plan.file, code: prepare(language, code) }, ...inputs.map((input, i) => ({ file: `in_${i + 1}`, code: input || '' }))],
    save: false,
  };

  return withSlot(async () => {
    let response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        response = await fetch(`${baseUrl()}/api/compile.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(90000, TIMEOUT_GRACE_MS + (COMPILE_MS[language] || 2000) + inputs.length * limit * 1000)),
        });
      } catch (error) {
        const err = error.name === 'TimeoutError'
          ? { status: 'timeout', stdout: '', error: 'Your code took too long to run.' }
          : { status: 'service-error', stdout: '', error: 'The code checker is unavailable right now. Try again in a minute.' };
        return inputs.map(() => ({ ...err, timeMs: null, memoryKb: null }));
      }
      if (response.status !== 429 || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt));
    }
    if (!response.ok) {
      const err = { status: 'service-error', stdout: '', error: response.status === 429 ? 'The code checker is busy. Try again in a minute.' : 'The code checker is unavailable right now.', timeMs: null, memoryKb: null };
      return inputs.map(() => err);
    }

    const out = String((await response.json()).program_output || '');
    if (out.includes('@@NOTOOL')) return null; // toolchain moved: use per-test mode
    const b64 = (s) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');
    const usage = { timeMs: null, memoryKb: null };

    const compileFail = out.match(/^@@COMPILE ?(\S*)$/m);
    if (compileFail) {
      const error = clip(b64(compileFail[1]).replaceAll(`${T}/`, ''), 4000) || 'Compilation failed.';
      return inputs.map(() => ({ status: 'compile-error', stdout: '', error, ...usage }));
    }

    const byIndex = new Map();
    for (const line of out.split('\n')) {
      const m = line.match(/^@@T (\d+) (\d+) ?(\S*) ?(\S*)$/);
      if (m) byIndex.set(Number(m[1]), { rc: Number(m[2]), stdout: clip(b64(m[3])), stderr: clip(b64(m[4]), 4000) });
    }
    return inputs.map((_, i) => {
      const r = byIndex.get(i + 1);
      // Missing line: the whole sandbox was stopped (overall time limit).
      if (!r) return { status: 'timeout', stdout: '', error: 'Your code took too long to run.', ...usage };
      if (r.rc === 137 || r.rc === 124) return { status: 'timeout', stdout: r.stdout, error: 'Your code took too long to run.', ...usage };
      if (r.rc !== 0) return { status: 'runtime-error', stdout: r.stdout, error: r.stderr || `Exited with code ${r.rc}`, ...usage };
      return { status: 'ok', stdout: r.stdout, error: '', ...usage };
    });
  });
}

// Quick reachability check for the admin page.
async function ping() {
  const result = await runCode('python', 'print(6 * 7)', { cpuTimeLimit: 5 });
  return result.status === 'ok' && result.stdout.trim() === '42';
}

module.exports = { runCode, runBatch, ping, SUPPORTED_LANGUAGES: Object.keys(LANGUAGES), pickCompilers };
