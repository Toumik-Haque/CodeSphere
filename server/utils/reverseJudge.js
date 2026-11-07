// Reverse Coding evaluator: runs code against tests through Judge0 (never on
// this server) and compares outputs using the challenge's output policy.

const { runCode } = require('../config/judge0');

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

  for (let i = 0; i < tests.length; i += 1) {
    const test = tests[i];
    const run = await runCode(language, code, {
      stdin: test.input,
      cpuTimeLimit: challenge.timeLimit,
      memoryLimitKb: challenge.memoryLimitKb,
    });
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

    // A compile error or a broken checker affects every test: stop early.
    if (status === 'compile-error' || status === 'system-error') {
      for (let j = i + 1; j < tests.length; j += 1) {
        results.push({ index: j + 1, hidden: tests[j].hidden, status: 'skipped' });
      }
      break;
    }
  }

  return { verdict, passed, total: tests.length, runtimeMs: runtimeMs || null, results };
}

module.exports = { evaluate, outputsMatch, normalise };
