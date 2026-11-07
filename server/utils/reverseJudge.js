// Reverse Coding evaluator: runs code against tests through Judge0 (never on
// this server) and compares outputs using the challenge's output policy.

const { runCode, runBatch } = require('../config/codeRunner');

function normalise(text, policy) {
  const value = String(text ?? '').replace(/\r\n?/g, '\n');
  if (policy === 'tokens') return value.split(/\s+/).filter(Boolean).join(' ');
  if (policy === 'trim') {
    return value
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n')
      .replace(/\n+$/, '');
  }
  // exact: only a single final newline is ignored.
  return value.replace(/\n$/, '');
}

function outputsMatch(actual, expected, policy) {
  return normalise(actual, policy) === normalise(expected, policy);
}

const VERDICT_FROM_STATUS = {
  'compile-error': 'compile-error',
  'runtime-error': 'runtime-error',
  timeout: 'timeout',
  'service-error': 'system-error',
};

/**
 * Run `code` against `tests` ([{ input, output, hidden }]).
 * Returns { verdict, passed, total, runtimeMs, results }. Results for hidden
 * tests carry only their status, never input/expected/actual output.
 */
async function evaluate(challenge, language, code, tests) {
  const results = [];
  let passed = 0;
  let runtimeMs = 0;
  let verdict = 'accepted';
  const runTest = (test) => runCode(language, code, {
    stdin: test.input,
    cpuTimeLimit: challenge.timeLimit,
    memoryLimitKb: challenge.memoryLimitKb,
  });

  // Preferred: every test in one request (compile once). Otherwise run the
  // first test alone (a compile error fails everything cheaply), then the
  // rest in parallel; the runner caps how many run at once.
  let runs = await runBatch(language, code, tests.map((t) => t.input), {
    cpuTimeLimit: challenge.timeLimit,
    memoryLimitKb: challenge.memoryLimitKb,
  });
  if (!runs) {
    const first = tests.length ? await runTest(tests[0]) : null;
    const firstBroken = first && ['compile-error', 'service-error'].includes(first.status);
    const rest = firstBroken ? [] : await Promise.all(tests.slice(1).map(runTest));
    runs = first ? [first, ...rest] : [];
  }
  // A compile error (or a down checker) applies to every test: report it once.
  if (runs.length && ['compile-error', 'service-error'].includes(runs[0].status)) runs = [runs[0]];

  for (let i = 0; i < tests.length; i += 1) {
    const test = tests[i];
    const run = runs[i];
    if (!run) {
      results.push({ index: i + 1, hidden: test.hidden, status: 'skipped' });
      continue;
    }
    runtimeMs = Math.max(runtimeMs, run.timeMs || 0);

    let status;
    if (run.status !== 'ok') status = VERDICT_FROM_STATUS[run.status] || 'system-error';
    else status = outputsMatch(run.stdout, test.output, challenge.outputPolicy) ? 'passed' : 'wrong';

    if (status === 'passed') passed += 1;
    else if (verdict === 'accepted') verdict = status === 'wrong' ? 'wrong' : status;

    results.push(test.hidden
      ? { index: i + 1, hidden: true, status }
      : {
        index: i + 1,
        hidden: false,
        status,
        input: test.input,
        expected: test.output,
        actual: run.stdout.slice(0, 2000),
        error: run.error ? run.error.slice(0, 2000) : '',
      });
  }

  return { verdict, passed, total: tests.length, runtimeMs: runtimeMs || null, results };
}

module.exports = { evaluate, outputsMatch, normalise };
