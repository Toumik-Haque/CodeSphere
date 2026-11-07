/**
 * Generates the Debugging Arena question bank: server/data/debugBugsGenerated.json
 *
 * Usage (from server/):
 *   node scripts/generateDebugBugs.js
 *
 * Every question comes from a hand-checked bug TEMPLATE applied to a CONTEXT
 * (marks, prices, scores, ...), so answers are always correct. Output is
 * deterministic: running it again produces the same file.
 *
 * IMPORTANT: student progress is stored by question id
 * ("gen-<template>-<context>"). Only ADD templates/contexts at the END of
 * their lists, and don't edit existing ones, or students' completed history
 * will no longer match.
 */

const fs = require('fs');
const path = require('path');

const TARGET = 1000;
const OUTPUT = path.join(__dirname, '..', 'data', 'debugBugsGenerated.json');

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seedText) {
  let a = hash(seedText);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

function shuffle(rng, list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const cap = (word) => word[0].toUpperCase() + word.slice(1);
const sum = (values) => values.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Contexts: the "story" each question is about
// ---------------------------------------------------------------------------

const CONTEXTS = [
  { pl: 'marks', s: 'mark', label: 'exam marks', min: 35, max: 98 },
  { pl: 'prices', s: 'price', label: 'product prices', min: 20, max: 950 },
  { pl: 'scores', s: 'score', label: 'game scores', min: 10, max: 99 },
  { pl: 'temps', s: 'temp', label: 'daily temperatures', min: 12, max: 44 },
  { pl: 'ages', s: 'age', label: 'member ages', min: 17, max: 26 },
  { pl: 'salaries', s: 'salary', label: 'monthly salaries', min: 12000, max: 90000 },
  { pl: 'steps', s: 'step', label: 'daily step counts', min: 2000, max: 15000 },
  { pl: 'ratings', s: 'rating', label: 'app ratings', min: 1, max: 5 },
  { pl: 'distances', s: 'distance', label: 'run distances', min: 2, max: 21 },
  { pl: 'weights', s: 'weight', label: 'parcel weights', min: 1, max: 30 },
  { pl: 'votes', s: 'vote', label: 'poll votes', min: 5, max: 400 },
  { pl: 'likes', s: 'like', label: 'post likes', min: 3, max: 900 },
  { pl: 'goals', s: 'goal', label: 'goals per match', min: 0, max: 6 },
  { pl: 'runs', s: 'run', label: 'cricket runs', min: 4, max: 120 },
  { pl: 'heights', s: 'height', label: 'student heights', min: 140, max: 190 },
  { pl: 'speeds', s: 'speed', label: 'download speeds', min: 5, max: 300 },
  { pl: 'sales', s: 'sale', label: 'daily sales', min: 100, max: 5000 },
  { pl: 'points', s: 'point', label: 'quiz points', min: 1, max: 50 },
  { pl: 'minutes', s: 'minute', label: 'study minutes', min: 15, max: 180 },
  { pl: 'calories', s: 'calorie', label: 'meal calories', min: 120, max: 900 },
];

const NAMES = ['Asha', 'Rahul', 'Meera', 'Kabir', 'Riya', 'Arjun', 'Sneha', 'Vikram', 'Priya', 'Rohan'];

// ---------------------------------------------------------------------------
// Memes, per category
// ---------------------------------------------------------------------------

const MEMES = {
  python: [
    'Python: "I\'ll tell you the error… on the very last line." 🐍',
    'Indentation is not a style choice in Python. It\'s the law. 📏',
    'When the code runs on the first try and you get suspicious. 🤨',
    'Me: it works. Python: NameError. Me: it doesn\'t work. 🫠',
    'Spent 2 hours on this bug. The fix was 1 character. Worth it? Absolutely not. 😩',
    'Traceback (most recent call last): my confidence. 📉',
    'print("here") — the most powerful debugger ever made. 🔍',
    'When you finally read the error message instead of panicking. 🧘',
  ],
  javascript: [
    'JavaScript: where "1" + 1 = "11" and nobody is surprised anymore. 🤡',
    'undefined is not a function. Neither is my sleep schedule. 😵',
    'console.log("why") — every JS developer, every day. 🤔',
    'NaN: Not a Number, but definitely a problem. 🧮',
    'Me: I understand JavaScript. JavaScript: [] + {} 🙃',
    'It worked on my machine. Then I opened a second tab. 🌐',
    'Async bugs: they happen later, just like my motivation. ⏳',
    'When the bug was a missing return all along. 🫥',
  ],
  c: [
    'Segmentation fault (core dumped) — C\'s way of saying "no." 💥',
    'C gives you enough rope to shoot yourself in the foot. 🦶',
    'Arrays start at 0. My will to live starts at -1. 💀',
    'The compiler warned me. I ignored it. We\'re here now. ⚠️',
    'One semicolon to rule them all. One semicolon to break them. 💍',
    'Undefined behaviour: works today, explodes at the demo. 🎆',
    'printf debugging: because gdb is scary. 🖨️',
    'When you finally find the bug and it\'s a single = sign. 🙃',
  ],
  logic: [
    'No error. No warning. Just confidently wrong. 📉',
    'The code does exactly what I wrote. That\'s the problem. 🤦',
    'Off-by-one errors: the most common bug, give or take one. 🤓',
    'Logic bugs: the compiler is happy, the user is not. 😬',
    'Tested it with one value. Shipped it. Regretted it. 🚢',
    'If it compiles, it works. — famous last words. 🪦',
    'Rubber duck debugging: the duck saw the bug before I did. 🦆',
    'When the output is "correct" for every input except the real ones. 🎯',
  ],
  git: [
    'git push --force: the developer equivalent of "hold my chai." ☕',
    'Two branches enter. One line leaves. ⚔️',
    '"git add ." — the most dangerous 10 characters in software. 🔑',
    'Merge conflict? Just pick both and pray. 🙏',
    'My commit messages: "fix", "fix again", "final fix", "real final fix". 📝',
    'Detached HEAD: when your code is as lost as you are. 🧭',
    'git blame: discovering the bug was you, 3 months ago. 🕵️',
    'It\'s not a bug until it\'s in main. 🌳',
  ],
};

// ---------------------------------------------------------------------------
// Templates. Each returns { level, code, correct, wrong[], explanation }.
// `v` is a list of 5 sample values for the context.
// ---------------------------------------------------------------------------

const PY = 'python';
const JS = 'javascript';
const C = 'c';
const LOGIC = 'logic';
const GIT = 'git';

const TEMPLATES = [
  // ----- Python -----
  {
    id: 'py-name-typo', category: PY,
    make: ({ pl, s }, v) => ({
      level: 'Beginner',
      code: `def total_${pl}(${pl}):
    total = 0
    for ${s} in ${pl}:
        total += ${s}
    return totl

print(total_${pl}([${v.join(', ')}]))`,
      correct: 'The return uses `totl`, which is never defined',
      wrong: ['for loops can\'t add numbers', 'The function needs a return type', 'Lists can\'t be passed to functions', '`total` must be declared global'],
      explanation: 'The function builds `total` but returns `totl`. Python raises NameError: name \'totl\' is not defined. Return `total` instead.',
    }),
  },
  {
    id: 'py-input-str', category: PY,
    make: ({ s }, v, rng) => {
      const add = int(rng, 2, 10);
      return {
        level: 'Beginner',
        code: `${s} = input("Enter a ${s}: ")
new_${s} = ${s} + ${add}
print("Updated ${s}:", new_${s})`,
        correct: 'input() returns a string, so adding a number fails',
        wrong: ['input() needs a second argument', 'Variable names can\'t contain underscores', 'print() can\'t take two arguments', 'The + operator only works on lists'],
        explanation: `input() always returns a str, and Python won't add a str and an int (TypeError). Convert first: ${s} = int(input(...)).`,
      };
    },
  },
  {
    id: 'py-mutable-default', category: PY,
    make: ({ pl, s }, v) => ({
      level: 'Medium',
      code: `def add_${s}(${s}, ${pl}=[]):
    ${pl}.append(${s})
    return ${pl}

print(add_${s}(${v[0]}))
print(add_${s}(${v[1]}))   # expected [${v[1]}]`,
      correct: 'The default list is created once and shared between calls',
      wrong: ['append() returns None', 'Numbers can\'t be appended to lists', 'Default arguments must come first', 'The function must be called with keyword arguments'],
      explanation: `Default values are evaluated once, when the function is defined, so every call reuses the same list. The second call prints [${v[0]}, ${v[1]}]. Use ${pl}=None and create a new list inside the function.`,
    }),
  },
  {
    id: 'py-return-in-loop', category: PY,
    make: ({ pl, s }, v) => ({
      level: 'Easy',
      code: `def sum_${pl}(${pl}):
    total = 0
    for ${s} in ${pl}:
        total += ${s}
        return total

print(sum_${pl}([${v.join(', ')}]))   # expected ${sum(v)}`,
      correct: '`return` is inside the loop, so it stops after the first item',
      wrong: ['`total` should start at 1', 'The loop variable shadows the list', 'Functions can\'t return integers', 'sum_ is a reserved prefix'],
      explanation: `Because \`return total\` is indented inside the for loop, the function returns after the first item and prints ${v[0]}. Dedent the return so it runs after the loop.`,
    }),
  },
  {
    id: 'py-range-skip-first', category: PY,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `${pl} = [${v.join(', ')}]
total = 0
for i in range(1, len(${pl})):
    total += ${pl}[i]

print("Total:", total)   # expected ${sum(v)}`,
      correct: 'range(1, ...) skips the first item at index 0',
      wrong: ['len() returns the last index', 'Lists can\'t be indexed with i', 'range() needs three arguments', '`total +=` only works with strings'],
      explanation: `Python lists start at index 0. range(1, len(${pl})) skips ${pl}[0], so it prints ${sum(v) - v[0]}. Use range(len(${pl})) or just loop over the items.`,
    }),
  },
  {
    id: 'py-remove-while-iterating', category: PY,
    make: ({ pl, s }, v, rng) => {
      const th = int(rng, 30, 60);
      const values = [th - int(rng, 5, 15), th - int(rng, 1, 4), th + int(rng, 5, 20), th - int(rng, 2, 9), th + int(rng, 1, 30)];
      const kept = [...values];
      for (let i = 0; i < kept.length; i += 1) {
        if (kept[i] < th) kept.splice(kept.indexOf(kept[i]), 1);
      }
      const skipped = values.filter((x) => x < th && kept.includes(x));
      return {
        level: 'Medium',
        code: `${pl} = [${values.join(', ')}]

# remove every ${s} below ${th}
for ${s} in ${pl}:
    if ${s} < ${th}:
        ${pl}.remove(${s})

print(${pl})`,
        correct: 'Removing items while looping over the same list skips elements',
        wrong: ['remove() deletes every matching value at once', 'The comparison should use <=', 'Lists are immutable in Python', 'The loop needs a break'],
        explanation: `When an item is removed, the next one shifts into its place and the loop skips it. Here ${skipped.join(' and ')} survive${skipped.length === 1 ? 's' : ''} and it prints [${kept.join(', ')}]. Build a new list instead: ${pl} = [x for x in ${pl} if x >= ${th}].`,
      };
    },
  },
  {
    id: 'py-missing-colon', category: PY,
    make: ({ s }, v, rng) => {
      const th = int(rng, 10, 80);
      return {
        level: 'Beginner',
        code: `${s} = ${v[0]}

if ${s} > ${th}
    print("High ${s}")
else:
    print("Normal ${s}")`,
        correct: 'The `if` line is missing a colon',
        wrong: ['else needs a condition', 'print() needs parentheses removed', 'Strings must use single quotes', 'Variables must be declared with var'],
        explanation: 'Every if, elif, else, for, while and def line must end with a colon. Python raises SyntaxError: expected \':\'.',
      };
    },
  },
  {
    id: 'py-assign-in-if', category: PY,
    make: ({ s }, v) => ({
      level: 'Beginner',
      code: `${s} = ${v[0]}

if ${s} = ${v[1]}:
    print("Match!")`,
      correct: '`=` assigns; comparison needs `==`',
      wrong: ['if statements need brackets', 'Integers can\'t be compared', 'The colon should be a semicolon', 'print() can\'t be inside an if'],
      explanation: 'Python doesn\'t allow assignment inside an if condition, so this is a SyntaxError. Use == to compare values.',
    }),
  },
  {
    id: 'py-str-immutable', category: PY,
    make: ({ label }) => ({
      level: 'Easy',
      code: `title = "${label}"
title[0] = "${label[0].toUpperCase()}"
print(title)`,
      correct: 'Strings are immutable, so you can\'t assign to an index',
      wrong: ['Strings can\'t be indexed', 'Index 0 doesn\'t exist', 'upper-case letters need escaping', 'title is a reserved word'],
      explanation: 'Python strings can\'t be changed in place (TypeError: \'str\' object does not support item assignment). Create a new string instead: title = title.capitalize().',
    }),
  },
  {
    id: 'py-index-out-of-range', category: PY,
    make: ({ pl, s }, v) => ({
      level: 'Beginner',
      code: `${pl} = [${v.join(', ')}]
last_${s} = ${pl}[len(${pl})]
print("Latest ${s}:", last_${s})`,
      correct: 'len(...) is one past the last valid index',
      wrong: ['len() doesn\'t work on lists', 'Lists start at index 1', 'You can\'t store a list item in a variable', 'print() can\'t print integers'],
      explanation: `${pl} has ${v.length} items, so valid indexes are 0 to ${v.length - 1}. ${pl}[${v.length}] raises IndexError. Use ${pl}[-1] or ${pl}[len(${pl}) - 1].`,
    }),
  },
  {
    id: 'py-not-called', category: PY,
    make: ({ pl }, v) => ({
      level: 'Beginner',
      code: `def get_total():
    ${pl} = [${v.join(', ')}]
    return sum(${pl})

print("Total ${pl}:", get_total)`,
      correct: 'The function is never called (missing parentheses)',
      wrong: ['sum() only works on two numbers', 'Functions must take parameters', 'return can\'t return a function call', 'Lists can\'t be created inside functions'],
      explanation: `get_total without () refers to the function itself, so it prints something like <function get_total at 0x...>. Call it: get_total() gives ${sum(v)}.`,
    }),
  },
  {
    id: 'py-shadow-sum', category: PY,
    make: ({ pl, s }, v) => ({
      level: 'Medium',
      code: `${pl} = [${v.join(', ')}]

sum = 0
for ${s} in ${pl}:
    sum += ${s}

average = sum(${pl}) / len(${pl})
print(average)`,
      correct: 'The variable `sum` hides the built-in sum() function',
      wrong: ['len() can\'t be used in division', 'Integers can\'t be divided in Python', 'average is a reserved keyword', 'The for loop must use range()'],
      explanation: 'After sum = 0, the name sum refers to an int, so sum(...) raises TypeError: \'int\' object is not callable. Don\'t name variables after built-ins; use total instead.',
    }),
  },
  {
    id: 'py-append-returns-none', category: PY,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `${pl} = [${v.slice(0, 4).join(', ')}]
${pl} = ${pl}.append(${v[4]})
print("Count:", len(${pl}))`,
      correct: 'append() changes the list and returns None',
      wrong: ['append() can only add strings', 'len() needs two arguments', 'Lists can only hold 4 items', 'You must use extend() for one item'],
      explanation: `list.append() modifies the list in place and returns None, so ${pl} becomes None and len() raises TypeError. Just call ${pl}.append(${v[4]}) without reassigning.`,
    }),
  },
  {
    id: 'py-unbound-local', category: PY,
    make: ({ s }) => ({
      level: 'Medium',
      code: `${s}_count = 0

def record_${s}():
    ${s}_count += 1

record_${s}()
print(${s}_count)`,
      correct: 'The function assigns to a global without declaring it `global`',
      wrong: ['Functions can\'t be called before print()', '+= only works on strings', 'Function names can\'t contain underscores', 'The function needs a return statement to run'],
      explanation: `Assigning inside a function makes ${s}_count local, so += reads it before it exists: UnboundLocalError. Add \`global ${s}_count\`, or better, pass the value in and return the new one.`,
    }),
  },
  {
    id: 'py-sort-returns-none', category: PY,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `${pl} = [${v.join(', ')}]
ranked = ${pl}.sort(reverse=True)
print("Top:", ranked[0])`,
      correct: 'list.sort() sorts in place and returns None',
      wrong: ['sort() can\'t sort numbers', 'reverse must be a string', 'Index 0 is the smallest item', 'sort() needs a key argument'],
      explanation: `.sort() returns None, so ranked[0] raises TypeError: 'NoneType' object is not subscriptable. Use ranked = sorted(${pl}, reverse=True).`,
    }),
  },
  {
    id: 'py-key-error', category: PY,
    make: ({ pl }, v, rng) => {
      const names = shuffle(rng, NAMES).slice(0, 4);
      return {
        level: 'Easy',
        code: `${pl} = {"${names[0]}": ${v[0]}, "${names[1]}": ${v[1]}, "${names[2]}": ${v[2]}}

print(${pl}["${names[3]}"])`,
        correct: `"${names[3]}" isn't a key in the dictionary`,
        wrong: ['Dictionary values can\'t be numbers', 'Dictionaries must be accessed with a dot', 'Keys must be integers', 'print() can\'t print dictionary values'],
        explanation: `Accessing a missing key raises KeyError: '${names[3]}'. Check first with \`if "${names[3]}" in ${pl}\`, or use ${pl}.get("${names[3]}", 0).`,
      };
    },
  },
  {
    id: 'py-str-int-concat', category: PY,
    make: ({ pl }, v) => ({
      level: 'Beginner',
      code: `${pl} = [${v.join(', ')}]
total = sum(${pl})
print("Total ${pl}: " + total)`,
      correct: 'You can\'t join a string and an int with +',
      wrong: ['sum() returns a string', 'print() only accepts one word', 'Lists can\'t be summed', 'The colon inside the string is invalid'],
      explanation: 'Python raises TypeError: can only concatenate str (not "int") to str. Use an f-string, f"Total: {total}", or str(total).',
    }),
  },

  // ----- JavaScript -----
  {
    id: 'js-strict-equality', category: JS,
    make: ({ s }, v) => ({
      level: 'Beginner',
      code: `const ${s} = "${v[0]}";   // read from a form field

if (${s} === ${v[0]}) {
  console.log("Match!");
} else {
  console.log("No match");
}`,
      correct: 'A string is compared to a number with ===',
      wrong: ['const can\'t hold strings', 'if needs square brackets', 'console.log needs a semicolon inside', 'else must come before if'],
      explanation: `=== checks type and value. "${v[0]}" is a string and ${v[0]} is a number, so it prints "No match". Convert first: Number(${s}) === ${v[0]}.`,
    }),
  },
  {
    id: 'js-var-in-timeout', category: JS,
    make: ({ pl }, v) => ({
      level: 'Medium',
      code: `const ${pl} = [${v.slice(0, 3).join(', ')}];

for (var i = 0; i < ${pl}.length; i++) {
  setTimeout(() => console.log(${pl}[i]), 100);
}
// expected: ${v.slice(0, 3).join(' ')}`,
      correct: '`var` shares one `i`, which is 3 when the callbacks run',
      wrong: ['setTimeout needs a function name', 'Arrow functions can\'t read arrays', 'The loop should start at 1', 'console.log can\'t print numbers'],
      explanation: `var is function-scoped, so all callbacks see the same i, which is 3 by the time they run. ${pl}[3] is undefined, printed 3 times. Use let i to get a fresh i each iteration.`,
    }),
  },
  {
    id: 'js-missing-await', category: JS,
    make: ({ pl }, v) => ({
      level: 'Medium',
      code: `async function load${cap(pl)}() {
  return [${v.join(', ')}];
}

const ${pl} = load${cap(pl)}();
console.log(${pl}.length);   // expected ${v.length}`,
      correct: 'The async function returns a Promise; `await` is missing',
      wrong: ['async functions can\'t return arrays', 'length only works on strings', 'const should be let', 'Function names can\'t start with load'],
      explanation: `An async function always returns a Promise, and a Promise has no length, so it logs undefined. Use const ${pl} = await load${cap(pl)}(); inside an async function, or .then().`,
    }),
  },
  {
    id: 'js-foreach-return', category: JS,
    make: ({ pl, s }, v) => ({
      level: 'Medium',
      code: `function has${cap(s)}(${pl}, target) {
  ${pl}.forEach((${s}) => {
    if (${s} === target) return true;
  });
  return false;
}

console.log(has${cap(s)}([${v.join(', ')}], ${v[2]}));   // expected true`,
      correct: '`return` inside forEach only exits the callback, not the function',
      wrong: ['=== can\'t compare numbers', 'forEach doesn\'t loop over arrays', 'Functions can\'t return booleans', 'target is a reserved word'],
      explanation: `The return true only leaves the arrow callback; the outer function always reaches return false. Use ${pl}.includes(target) or ${pl}.some((x) => x === target).`,
    }),
  },
  {
    id: 'js-const-reassign', category: JS,
    make: ({ pl, s }, v) => ({
      level: 'Beginner',
      code: `const ${pl} = [${v.join(', ')}];
const total = 0;

for (const ${s} of ${pl}) {
  total += ${s};
}
console.log(total);`,
      correct: '`total` is a const, so it can\'t be reassigned',
      wrong: ['for...of doesn\'t work with arrays', 'Arrays can\'t be const', 'console.log can\'t print numbers', '+= only works with strings'],
      explanation: 'const bindings can\'t change, so total += ... throws TypeError: Assignment to constant variable. Declare it with let total = 0.',
    }),
  },
  {
    id: 'js-default-sort', category: JS,
    make: ({ pl }, v, rng) => {
      const values = [int(rng, 20, 99), int(rng, 2, 9), int(rng, 100, 199), int(rng, 20, 99), int(rng, 2, 9)];
      const wrongOrder = values.map(String).sort().join(', ');
      const right = [...values].sort((a, b) => a - b).join(', ');
      if (right === wrongOrder) throw new Error('sort example does not show the bug');
      return {
        level: 'Easy',
        code: `const ${pl} = [${values.join(', ')}];
${pl}.sort();
console.log(${pl});   // expected [${right}]`,
        correct: 'sort() compares items as strings by default',
        wrong: ['sort() sorts in descending order', 'sort() can\'t sort numbers at all', 'sort() returns a new array and leaves the original', 'The array must be declared with let'],
        explanation: `Without a compare function, sort() converts numbers to strings, giving [${wrongOrder}]. Use ${pl}.sort((a, b) => a - b).`,
      };
    },
  },
  {
    id: 'js-string-plus-number', category: JS,
    make: ({ s }, v) => ({
      level: 'Beginner',
      code: `const ${s}A = "${v[0]}";   // from an <input> field
const ${s}B = ${v[1]};

console.log("Total:", ${s}A + ${s}B);   // expected ${v[0] + v[1]}`,
      correct: 'A string plus a number joins them as text',
      wrong: ['+ can\'t be used inside console.log', 'Variable names can\'t end in capital letters', 'const values can\'t be added', 'console.log only accepts one argument'],
      explanation: `Values from inputs are strings, so "${v[0]}" + ${v[1]} becomes "${v[0]}${v[1]}". Convert first: Number(${s}A) + ${s}B.`,
    }),
  },
  {
    id: 'js-assign-in-if', category: JS,
    make: ({ s }, v) => ({
      level: 'Beginner',
      code: `let ${s} = ${v[0]};

if (${s} = ${v[1] || 1}) {
  console.log("${cap(s)} is exactly ${v[1] || 1}");
}`,
      correct: '`=` assigns instead of comparing, so the condition is always truthy',
      wrong: ['let can\'t hold numbers', 'if needs a semicolon after the condition', 'Template strings are required here', 'console.log can\'t be inside if'],
      explanation: `${s} = ${v[1] || 1} assigns a value, and any non-zero number is truthy, so the message always prints and ${s} is overwritten. Use === to compare.`,
    }),
  },
  {
    id: 'js-map-no-return', category: JS,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `const ${pl} = [${v.slice(0, 4).join(', ')}];

const doubled = ${pl}.map((x) => {
  x * 2;
});
console.log(doubled);`,
      correct: 'The arrow function has braces but no `return`',
      wrong: ['map() changes the original array', 'Arrow functions can\'t do math', 'map() needs an index argument', 'doubled must be declared with let'],
      explanation: 'With curly braces, an arrow function needs an explicit return, so every item becomes undefined. Use (x) => x * 2 or add return x * 2;.',
    }),
  },
  {
    id: 'js-loop-past-end', category: JS,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `const ${pl} = [${v.join(', ')}];
let total = 0;

for (let i = 0; i <= ${pl}.length; i++) {
  total += ${pl}[i];
}
console.log(total);   // expected ${sum(v)}`,
      correct: '`i <= length` reads one item past the end, adding undefined',
      wrong: ['let can\'t be used in loops', 'total must start at 1', 'Arrays have no length property', '+= can\'t add numbers'],
      explanation: `The last pass reads ${pl}[${v.length}], which is undefined, and number + undefined is NaN. Use i < ${pl}.length.`,
    }),
  },
  {
    id: 'js-property-typo', category: JS,
    make: ({ pl }, v) => {
      const typo = pl.slice(0, 1) + pl.slice(2);
      return {
        level: 'Beginner',
        code: `const club = {
  name: "CodeSphere",
  ${pl}: [${v.join(', ')}],
};

console.log(club.${typo}.length);`,
        correct: `\`club.${typo}\` is a typo, so it's undefined`,
        wrong: ['Objects can\'t contain arrays', 'length only works on strings', 'The trailing comma is a syntax error', 'Object keys must be quoted'],
        explanation: `club.${typo} doesn't exist, so it's undefined, and reading .length throws TypeError: Cannot read properties of undefined. Use club.${pl}.`,
      };
    },
  },
  {
    id: 'js-object-equality', category: JS,
    make: ({ s }, v) => ({
      level: 'Medium',
      code: `const a = { ${s}: ${v[0]} };
const b = { ${s}: ${v[0]} };

if (a === b) {
  console.log("Same ${s}!");
} else {
  console.log("Different");
}`,
      correct: '=== compares object references, not their contents',
      wrong: ['Objects can\'t hold numbers', '=== only works with strings', 'The objects need a name property', 'const objects can\'t be compared'],
      explanation: `a and b are two different objects in memory, so a === b is false. Compare the values instead: a.${s} === b.${s}.`,
    }),
  },
  {
    id: 'js-tdz', category: JS,
    make: ({ pl }, v) => ({
      level: 'Medium',
      code: `console.log("Total ${pl}:", total);

let total = ${sum(v)};`,
      correct: '`total` is used before its `let` declaration',
      wrong: ['console.log needs a template string', 'let can only hold strings', 'Numbers can\'t be logged with a label', 'The semicolon after the number is invalid'],
      explanation: 'Variables declared with let exist in a "temporal dead zone" until their declaration runs, so this throws ReferenceError: Cannot access \'total\' before initialization. Declare it first.',
    }),
  },

  // ----- C / C++ -----
  {
    id: 'c-assign-in-if', category: C,
    make: ({ s }, v) => ({
      level: 'Beginner',
      code: `#include <stdio.h>

int main() {
    int ${s} = ${v[0]};
    if (${s} = ${v[1] || 1}) {
        printf("${cap(s)} matched!\\n");
    }
    return 0;
}`,
      correct: '`=` assigns instead of `==` comparing',
      wrong: ['printf needs &' + s, 'int can\'t store this value', 'main must return void', 'if needs a semicolon'],
      explanation: `${s} = ${v[1] || 1} assigns a non-zero value, which C treats as true, so the message always prints. Use == to compare.`,
    }),
  },
  {
    id: 'c-array-bounds', category: C,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `#include <stdio.h>

int main() {
    int ${pl}[5] = {${v.join(', ')}};
    for (int i = 0; i <= 5; i++) {
        printf("%d\\n", ${pl}[i]);
    }
    return 0;
}`,
      correct: 'The loop reads past the end of the array',
      wrong: ['Arrays must start at index 1', '%d can\'t print int', 'Array size must be a variable', 'printf needs a second \\n'],
      explanation: `Valid indexes are 0 to 4. i <= 5 reads ${pl}[5], which is out of bounds: undefined behaviour, usually a garbage value. Use i < 5.`,
    }),
  },
  {
    id: 'c-switch-fallthrough', category: C,
    make: ({ s }) => ({
      level: 'Easy',
      code: `#include <stdio.h>

int main() {
    int level = 1;   // ${s} level
    switch (level) {
        case 1: printf("Low ${s}\\n");
        case 2: printf("Medium ${s}\\n");
        case 3: printf("High ${s}\\n");
    }
    return 0;
}`,
      correct: 'Missing `break` statements cause fall-through',
      wrong: ['switch can\'t use int', 'case labels must be strings', 'A default case is required', 'printf can\'t be used in switch'],
      explanation: `Without break, execution continues into the following cases, printing all three lines. Add break; after each case.`,
    }),
  },
  {
    id: 'c-integer-division', category: C,
    make: ({ pl }, v) => {
      const values = [...v];
      if (sum(values) % 5 === 0) values[0] += 1;
      const total = sum(values);
      return {
        level: 'Easy',
        code: `#include <stdio.h>

int main() {
    int ${pl}[5] = {${values.join(', ')}};
    int total = 0;
    for (int i = 0; i < 5; i++) total += ${pl}[i];

    float average = total / 5;
    printf("Average: %.2f\\n", average);   // expected ${(total / 5).toFixed(2)}
    return 0;
}`,
        correct: 'int / int does integer division before converting to float',
        wrong: ['%.2f can\'t print floats', 'float can\'t store decimals', 'The loop skips the last item', 'total must be a long'],
        explanation: `total / 5 is computed with integers, so the decimal part is dropped and it prints ${Math.floor(total / 5).toFixed(2)}. Use total / 5.0f or cast: (float) total / 5.`,
      };
    },
  },
  {
    id: 'c-scanf-ampersand', category: C,
    make: ({ s }) => ({
      level: 'Beginner',
      code: `#include <stdio.h>

int main() {
    int ${s};
    printf("Enter ${s}: ");
    scanf("%d", ${s});
    printf("You entered %d\\n", ${s});
    return 0;
}`,
      correct: 'scanf needs the address: `&' + s + '`',
      wrong: ['printf must come after scanf', '%d is for floats', 'Variables must be initialised to 0 for scanf', 'scanf can only read strings'],
      explanation: `scanf writes into memory, so it needs a pointer. Passing the value of ${s} is undefined behaviour and usually crashes. Use scanf("%d", &${s});.`,
    }),
  },
  {
    id: 'c-uninitialized', category: C,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `#include <stdio.h>

int main() {
    int ${pl}[5] = {${v.join(', ')}};
    int total;
    for (int i = 0; i < 5; i++) {
        total += ${pl}[i];
    }
    printf("Total: %d\\n", total);   // expected ${sum(v)}
    return 0;
}`,
      correct: '`total` is never initialised, so it starts with garbage',
      wrong: ['Arrays can\'t be summed in C', '%d can\'t print totals', 'The loop should start at 1', 'int can\'t hold the result'],
      explanation: 'Local variables in C are not zeroed automatically, so total starts with whatever was in memory. Write int total = 0;.',
    }),
  },
  {
    id: 'c-missing-semicolon', category: C,
    make: ({ s }, v) => ({
      level: 'Beginner',
      code: `#include <stdio.h>

int main() {
    int ${s} = ${v[0]}
    printf("${cap(s)}: %d\\n", ${s});
    return 0;
}`,
      correct: 'A semicolon is missing after the declaration',
      wrong: ['printf needs & before the variable', 'main must return void', '#include must end with ;', 'Variables need to be declared outside main'],
      explanation: `C statements end with a semicolon. The compiler reports "expected ';' before 'printf'". Write int ${s} = ${v[0]};.`,
    }),
  },
  {
    id: 'c-for-semicolon', category: C,
    make: ({ pl }, v) => ({
      level: 'Medium',
      code: `#include <stdio.h>

int main() {
    int ${pl}[5] = {${v.join(', ')}};
    int total = 0, i;
    for (i = 0; i < 5; i++);
    {
        total += ${pl}[i];
    }
    printf("Total: %d\\n", total);   // expected ${sum(v)}
    return 0;
}`,
      correct: 'The `;` after the for loop makes its body empty',
      wrong: ['Braces can\'t be on their own line', 'i must be declared inside for', 'total must be a float', 'printf needs \\t'],
      explanation: `for (...); loops over an empty statement. The block below runs once afterwards with i == 5, reading ${pl}[5] out of bounds. Remove the semicolon.`,
    }),
  },
  {
    id: 'c-string-compare', category: C,
    make: ({ pl }) => ({
      level: 'Medium',
      code: `#include <stdio.h>

int main() {
    char category[] = "${pl}";
    if (category == "${pl}") {
        printf("Found ${pl}\\n");
    } else {
        printf("Not found\\n");
    }
    return 0;
}`,
      correct: '`==` compares addresses; strings need strcmp()',
      wrong: ['char arrays can\'t hold words', 'Strings need single quotes in C', 'printf can\'t print inside else', 'The array needs a fixed size'],
      explanation: `In C, == on strings compares pointers, not text, so this prints "Not found". Use #include <string.h> and strcmp(category, "${pl}") == 0.`,
    }),
  },
  {
    id: 'c-printf-format', category: C,
    make: ({ s }, v) => ({
      level: 'Easy',
      code: `#include <stdio.h>

int main() {
    float ${s} = ${v[0]}.5;
    printf("${cap(s)}: %d\\n", ${s});
    return 0;
}`,
      correct: '%d is used to print a float',
      wrong: ['float can\'t store .5', 'printf needs &' + s, 'Variable names must be uppercase', 'main must take arguments'],
      explanation: `%d expects an int, but a float is passed, which is undefined behaviour and prints garbage. Use %f (or %.1f for ${v[0]}.5).`,
    }),
  },
  {
    id: 'cpp-vector-bounds', category: C,
    make: ({ pl }, v) => ({
      level: 'Easy',
      code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> ${pl} = {${v.join(', ')}};
    for (size_t i = 0; i <= ${pl}.size(); i++) {
        cout << ${pl}[i] << endl;
    }
    return 0;
}`,
      correct: '`i <= size()` reads one element past the end',
      wrong: ['vectors can\'t be printed with cout', 'size_t can\'t be used in loops', 'endl must be "\\n"', 'vectors start at index 1'],
      explanation: `The last index is size() - 1. ${pl}[${v.length}] is out of bounds: undefined behaviour. Use i < ${pl}.size(), or a range loop: for (int x : ${pl}).`,
    }),
  },
  {
    id: 'c-if-semicolon', category: C,
    make: ({ s }, v, rng) => {
      const th = v[0] + int(rng, 5, 40);
      return {
        level: 'Medium',
        code: `#include <stdio.h>

int main() {
    int ${s} = ${v[0]};
    if (${s} > ${th});
    {
        printf("High ${s}!\\n");
    }
    return 0;
}`,
        correct: 'The `;` after the if makes the condition do nothing',
        wrong: ['if needs a else branch', 'Braces must be on the same line', '> can\'t compare ints', 'printf needs a return value'],
        explanation: `if (...); ends the if with an empty statement, so the block below always runs. ${s} is ${v[0]}, not above ${th}, yet it still prints. Remove the semicolon.`,
      };
    },
  },

  // ----- Logical errors -----
  {
    id: 'logic-average-divisor', category: LOGIC,
    make: ({ pl, s }, v) => {
      const values = v.slice(0, 3);
      return {
        level: 'Beginner',
        code: `${pl} = [${values.join(', ')}]
total = 0
for ${s} in ${pl}:
    total += ${s}

average = total / 2
print("Average:", average)`,
        correct: 'It divides by 2 instead of the number of items',
        wrong: ['total should start at 1', 'for loops can\'t add numbers', 'Division always rounds down', 'print needs an f-string'],
        explanation: `There are 3 items, so the average is ${(sum(values) / 3).toFixed(2)}, not ${sum(values) / 2}. Use len(${pl}) so it works for any list.`,
      };
    },
  },
  {
    id: 'logic-min-start-zero', category: LOGIC,
    make: ({ pl, s }, v) => {
      const values = v.map((x) => Math.max(1, x));
      return {
        level: 'Easy',
        code: `${pl} = [${values.join(', ')}]

lowest = 0
for ${s} in ${pl}:
    if ${s} < lowest:
        lowest = ${s}

print("Lowest ${s}:", lowest)   # expected ${Math.min(...values)}`,
        correct: '`lowest` starts at 0, so no positive value is ever lower',
        wrong: ['The comparison should be >', 'for loops can\'t compare numbers', 'lowest must be a list', 'print can\'t show integers'],
        explanation: `Every value is above 0, so lowest stays 0. Start with the first item (lowest = ${pl}[0]) or use min(${pl}).`,
      };
    },
  },
  {
    id: 'logic-off-by-one', category: LOGIC,
    make: ({ s }, v, rng) => {
      const n = int(rng, 5, 12);
      return {
        level: 'Beginner',
        code: `// print ${s} numbers 1 to ${n}
for (let i = 1; i < ${n}; i++) {
  console.log("${cap(s)} #" + i);
}`,
        correct: `\`i < ${n}\` stops at ${n - 1}, so #${n} is never printed`,
        wrong: ['let should be var', 'Loops can\'t start at 1', 'console.log needs a template string', 'i++ should be ++i'],
        explanation: `The loop runs while i < ${n}, so it stops after ${n - 1}. Use i <= ${n}. This is the classic off-by-one error.`,
      };
    },
  },
  {
    id: 'logic-condition-order', category: LOGIC,
    make: ({ s }, v, rng) => {
      const low = int(rng, 30, 45);
      const high = int(rng, 70, 85);
      const test = high + int(rng, 2, 10);
      return {
        level: 'Easy',
        code: `def grade(${s}):
    if ${s} >= ${low}:
        return "Pass"
    elif ${s} >= ${high}:
        return "Distinction"
    else:
        return "Fail"

print(grade(${test}))   # expected Distinction`,
        correct: 'The lower threshold is checked first, so Distinction is unreachable',
        wrong: ['elif must be written else if', 'Functions can\'t return strings', 'The else branch is missing a condition', '>= should be =>'],
        explanation: `Any value ≥ ${high} is also ≥ ${low}, so the first branch always wins and it returns "Pass". Check the highest threshold first.`,
      };
    },
  },
  {
    id: 'logic-counter-reset', category: LOGIC,
    make: ({ pl, s }, v, rng) => {
      const th = Math.min(...v) + 1;
      const expected = v.filter((x) => x >= th).length;
      void rng;
      return {
        level: 'Easy',
        code: `${pl} = [${v.join(', ')}]

for ${s} in ${pl}:
    count = 0
    if ${s} >= ${th}:
        count += 1

print("Count:", count)   # expected ${expected}`,
        correct: '`count` is reset to 0 on every loop iteration',
        wrong: ['>= should be >', 'count must be a string', 'for loops can\'t count', 'print can\'t take two arguments'],
        explanation: 'Because count = 0 is inside the loop, it restarts each time and ends as 0 or 1. Move count = 0 above the loop.',
      };
    },
  },
  {
    id: 'logic-percentage-swap', category: LOGIC,
    make: ({ pl }, v) => {
      v = [Math.max(1, v[0]), ...v.slice(1)];
      const total = sum(v);
      const part = v[0];
      return {
        level: 'Easy',
        code: `${pl} = [${v.join(', ')}]
part = ${pl}[0]
total = sum(${pl})

percent = total / part * 100
print(f"First item is {percent:.1f}% of all ${pl}")`,
        correct: 'The division is upside down: it should be part / total',
        wrong: ['sum() skips the first item', 'f-strings can\'t format decimals', 'Percentages need integer division', '100 must be written 100.0'],
        explanation: `The share of the first item is part / total * 100 = ${((part / total) * 100).toFixed(1)}%. The code computes total / part instead${part ? `, giving ${((total / part) * 100).toFixed(1)}%` : ''}.`,
      };
    },
  },
  {
    id: 'logic-and-vs-or', category: LOGIC,
    make: ({ s }, v, rng) => {
      const bad = int(rng, 101, 140);
      return {
        level: 'Easy',
        code: `def check_${s}(${s}):
    if ${s} < 0 and ${s} > 100:
        return "Invalid ${s}"
    return "OK"

print(check_${s}(${bad}))   # expected Invalid`,
        correct: 'A value can\'t be below 0 AND above 100; it should be `or`',
        wrong: ['< and > can\'t be in one if', 'The function must print, not return', 'Negative numbers aren\'t allowed in Python', 'return "OK" should be inside an else'],
        explanation: `No number is both < 0 and > 100, so the condition is never true and ${bad} returns "OK". Use or.`,
      };
    },
  },
  {
    id: 'logic-swap', category: LOGIC,
    make: ({ s }, values) => {
      // The bug is only visible when the two values differ.
      const v = [values[0], values[1] === values[0] ? values[0] + 1 : values[1]];
      return {
      level: 'Beginner',
      code: `first_${s} = ${v[0]}
second_${s} = ${v[1]}

# swap them
first_${s} = second_${s}
second_${s} = first_${s}

print(first_${s}, second_${s})   # expected ${v[1]} ${v[0]}`,
      correct: 'The first value is overwritten before it\'s copied',
      wrong: ['Variables can\'t be reassigned', 'print() needs a comma between strings', 'Underscores aren\'t allowed in names', 'Swapping requires a function'],
      explanation: `After the first line both variables hold ${v[1]}, so it prints ${v[1]} ${v[1]}. In Python write a, b = b, a, or use a temporary variable.`,
      };
    },
  },

  // ----- Git -----
  {
    id: 'git-conflict-markers', category: GIT,
    make: ({ pl, s }, v) => ({
      level: 'Beginner',
      code: `<<<<<<< HEAD
const max${cap(s)} = ${v[0]};
=======
const max${cap(s)} = ${v[1]};
>>>>>>> feature/${pl}-limits`,
      correct: 'A merge conflict: pick a version and delete the markers',
      wrong: ['The file is corrupted and must be deleted', 'Git added comments that are safe to leave', 'Run git push --force to fix it', 'The branch name is invalid'],
      explanation: 'Both branches changed the same line. Keep the right value (or combine them), remove the <<<<<<<, ======= and >>>>>>> lines, then git add and commit.',
    }),
  },
  {
    id: 'git-secret-push', category: GIT,
    make: ({ pl }) => ({
      level: 'Easy',
      code: `$ git add .
$ git commit -m "add ${pl} dashboard"
$ git push
! [remote rejected] (push declined: Push cannot contain secrets)`,
      correct: 'A file with an API key (like .env) was committed',
      wrong: ['GitHub is down', 'The commit message is too short', 'You must pull before every push', 'Branch names can\'t contain dashes'],
      explanation: 'git add . picked up a secrets file. Add .env to .gitignore, remove it from the commit itself (a later delete isn\'t enough), and rotate the key.',
    }),
  },
  {
    id: 'git-detached-head', category: GIT,
    make: ({ pl }, v, rng) => {
      const sha = hash(pl + rng()).toString(16).padStart(7, '0').slice(0, 7);
      return {
        level: 'Medium',
        code: `$ git checkout ${sha}
You are in 'detached HEAD' state...
$ git commit -m "fix ${pl} chart"
$ git switch main
Warning: you are leaving 1 commit behind`,
        correct: 'The commit isn\'t on any branch and can be lost',
        wrong: ['The commit was pushed automatically', 'main was deleted', 'Commits are impossible in detached HEAD', 'The commit hash is invalid'],
        explanation: 'Checking out a commit hash detaches HEAD, so new commits belong to no branch. Save them with git switch -c fix-' + pl + ' (or git branch fix-' + pl + ' <hash>).',
      };
    },
  },
  {
    id: 'git-non-fast-forward', category: GIT,
    make: ({ pl }) => ({
      level: 'Easy',
      code: `$ git push origin main
! [rejected]   main -> main (fetch first)
error: failed to push some refs
hint: Updates were rejected because the remote contains work
hint: that you do not have locally.   # ${pl} feature`,
      correct: 'Someone pushed first; pull (or fetch and merge) before pushing',
      wrong: ['Your Git version is too old', 'The repository was deleted', 'You need to rename the branch', 'You must delete your local commits'],
      explanation: 'The remote has commits you don\'t. Run git pull (fix any conflicts), then push again. Avoid --force on shared branches, because it erases teammates\' work.',
    }),
  },
  {
    id: 'git-untracked-file', category: GIT,
    make: ({ pl }) => ({
      level: 'Beginner',
      code: `$ git commit -m "add ${pl} page"
On branch main
Untracked files:
        src/pages/${cap(pl)}.jsx
nothing added to commit but untracked files present`,
      correct: 'The new file was never staged with git add',
      wrong: ['The commit message is invalid', 'JSX files can\'t be committed', 'You\'re on the wrong branch', 'The file is too large'],
      explanation: `Git only commits staged changes. Run git add src/pages/${cap(pl)}.jsx, then commit again.`,
    }),
  },
  {
    id: 'git-ignore-after-tracked', category: GIT,
    make: ({ pl }) => ({
      level: 'Medium',
      code: `$ echo "${pl}-cache.json" >> .gitignore
$ git status
modified:   ${pl}-cache.json     # still tracked!`,
      correct: '.gitignore doesn\'t affect files Git already tracks',
      wrong: ['.gitignore must be named gitignore.txt', 'echo can\'t write to files', 'JSON files can\'t be ignored', 'You must restart Git'],
      explanation: `.gitignore only stops untracked files from being added. Stop tracking it with git rm --cached ${pl}-cache.json (the file stays on disk), then commit.`,
    }),
  },
  {
    id: 'git-wrong-branch', category: GIT,
    make: ({ pl }) => ({
      level: 'Medium',
      code: `$ git branch
* main
  feature/${pl}-filter
$ git commit -m "add ${pl} filter"   # meant for the feature branch!`,
      correct: 'The commit went to main instead of the feature branch',
      wrong: ['Commits can\'t be made on main', 'The feature branch was deleted', 'The * means the branch is broken', 'Commit messages can\'t contain spaces'],
      explanation: `The * shows you're on main. If it isn't pushed yet: git branch feature/${pl}-filter-fix, then git reset --hard HEAD~1 on main, and continue on the new branch. Always check git branch before committing.`,
    }),
  },
];

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build() {
  const bugs = [];

  // Context-major order keeps categories balanced if the list is trimmed.
  for (const context of CONTEXTS) {
    for (const template of TEMPLATES) {
      const id = `gen-${template.id}-${context.pl}`;
      const rng = seeded(id);
      const values = Array.from({ length: 5 }, () => int(rng, context.min, context.max));
      const q = template.make(context, values, rng);

      const distractors = shuffle(rng, q.wrong).slice(0, 3);
      const options = shuffle(rng, [q.correct, ...distractors]);

      if (new Set(options).size !== 4) {
        throw new Error(`Duplicate options in ${id}`);
      }

      bugs.push({
        id,
        category: template.category,
        level: q.level,
        code: q.code,
        options,
        answer: options.indexOf(q.correct),
        explanation: q.explanation,
        meme: pick(rng, MEMES[template.category]),
      });
    }
  }

  return bugs.slice(0, TARGET);
}

const bugs = build();
fs.writeFileSync(OUTPUT, `${JSON.stringify(bugs, null, 2)}\n`);

const byCategory = bugs.reduce((acc, b) => ({ ...acc, [b.category]: (acc[b.category] || 0) + 1 }), {});
const byAnswer = bugs.reduce((acc, b) => ({ ...acc, ['ABCD'[b.answer]]: (acc['ABCD'[b.answer]] || 0) + 1 }), {});
console.log(`Wrote ${bugs.length} questions to ${path.relative(process.cwd(), OUTPUT)}`);
console.log('By category:', byCategory);
console.log('Correct answer position:', byAnswer);
