// Debugging Arena: "find the bug" questions for the Playground.
// `answer` is the index of the correct option. Kept on the server so answers
// are never sent to the browser before a student submits.
// Add new bugs at the end and never change an existing `id`: completed
// progress is stored by id.

const BUG_CATEGORIES = [
  { id: 'all', label: 'All Bugs', icon: 'bi-grid' },
  { id: 'python', label: 'Python Bugs', icon: 'bi-filetype-py' },
  { id: 'javascript', label: 'JavaScript Bugs', icon: 'bi-filetype-js' },
  { id: 'c', label: 'C/C++ Errors', icon: 'bi-cpu' },
  { id: 'logic', label: 'Logical Errors', icon: 'bi-diagram-3' },
  { id: 'git', label: 'Git Conflicts', icon: 'bi-git' },
];

const BUGS = [
  {
    id: 'py-undefined',
    category: 'python',
    level: 'Beginner',
    code: `def calculate(a, b):
    result = a + b
    return results

print(calculate(10, 20))`,
    options: [
      'Incorrect function name',
      'Undefined variable',
      'Incorrect indentation',
      'Missing semicolon',
    ],
    answer: 1,
    explanation:
      'The function stores the sum in `result` but returns `results`. Python raises NameError: name \'results\' is not defined.',
    meme: 'When you spend 3 hours debugging and discover it\'s just one typo. 🫠',
  },
  {
    id: 'py-mutable-default',
    category: 'python',
    level: 'Medium',
    code: `def add_member(name, team=[]):
    team.append(name)
    return team

print(add_member("Asha"))
print(add_member("Rahul"))   # expected ['Rahul']`,
    options: [
      'append() returns None',
      'The default list is shared between calls',
      'Strings can\'t be added to lists',
      'team must be declared global',
    ],
    answer: 1,
    explanation:
      'Default values are created once, when the function is defined, so every call reuses the same list. The second call prints [\'Asha\', \'Rahul\']. Use team=None and create a new list inside.',
    meme: 'Python default arguments: "I remember everything. Forever." 🐘',
  },
  {
    id: 'py-input-type',
    category: 'python',
    level: 'Beginner',
    code: `age = input("Enter your age: ")
print("Next year you'll be", age + 1)`,
    options: [
      'input() returns a string',
      'print() can\'t take two arguments',
      'age is a reserved keyword',
      'Missing colon after input()',
    ],
    answer: 0,
    explanation:
      'input() always returns a str, and Python won\'t add a str and an int (TypeError). Convert first: age = int(input(...)).',
    meme: '"20" + 1 walked into a bar. Python refused to serve it. 🍺🚫',
  },
  {
    id: 'js-equality',
    category: 'javascript',
    level: 'Beginner',
    code: `const marks = "100";

if (marks === 100) {
  console.log("Perfect score!");
} else {
  console.log("Keep going!");
}`,
    options: [
      'const can\'t hold strings',
      'Comparing a string to a number with ===',
      'console.log needs a semicolon inside',
      'if needs square brackets',
    ],
    answer: 1,
    explanation:
      '=== checks type and value. "100" is a string, 100 is a number, so it prints "Keep going!". Convert with Number(marks) before comparing.',
    meme: 'JavaScript: where "100" and 100 are the same… until they aren\'t. 🤡',
  },
  {
    id: 'js-var-loop',
    category: 'javascript',
    level: 'Medium',
    code: `for (var i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// expected: 1 2 3`,
    options: [
      'setTimeout needs a function name',
      'var is shared across loop iterations',
      'The loop condition should be i < 3',
      'Arrow functions can\'t use console.log',
    ],
    answer: 1,
    explanation:
      'var has function scope, so all three callbacks see the same i, which is 4 when they run. It prints 4 4 4. Use let to get a fresh i per iteration.',
    meme: 'Me expecting 1 2 3. JavaScript: "4 4 4, take it or leave it." 😎',
  },
  {
    id: 'js-async',
    category: 'javascript',
    level: 'Medium',
    code: `async function getUser() {
  return { name: "Meera" };
}

const user = getUser();
console.log(user.name);   // expected "Meera"`,
    options: [
      'async functions can\'t return objects',
      'getUser() returns a Promise, so await is missing',
      'name is a reserved property',
      'const should be let',
    ],
    answer: 1,
    explanation:
      'An async function always returns a Promise. user.name is undefined. Use const user = await getUser(); (inside an async function) or .then().',
    meme: 'Promises: I promised to return your data. I didn\'t say when. ⏳',
  },
  {
    id: 'c-assign-compare',
    category: 'c',
    level: 'Beginner',
    code: `#include <stdio.h>

int main() {
    int score = 40;
    if (score = 100) {
        printf("Full marks!\\n");
    }
    return 0;
}`,
    options: [
      'Missing return type',
      '= assigns instead of == comparing',
      'printf needs &score',
      'int can\'t store 100',
    ],
    answer: 1,
    explanation:
      'score = 100 assigns 100, and a non-zero value is true, so "Full marks!" always prints. Use == to compare.',
    meme: 'One equals sign. That\'s it. That\'s the whole bug. 🙃',
  },
  {
    id: 'c-array-bounds',
    category: 'c',
    level: 'Easy',
    code: `#include <stdio.h>

int main() {
    int marks[5] = {90, 85, 70, 60, 95};
    for (int i = 0; i <= 5; i++) {
        printf("%d\\n", marks[i]);
    }
    return 0;
}`,
    options: [
      'Arrays must start at index 1',
      'The loop reads past the end of the array',
      '%d is wrong for int',
      'Array size must be a variable',
    ],
    answer: 1,
    explanation:
      'Valid indexes are 0–4. i <= 5 reads marks[5], which is out of bounds: undefined behaviour, often a garbage value. Use i < 5.',
    meme: 'Arrays start at 0. My will to live starts at -1. 💀',
  },
  {
    id: 'cpp-missing-break',
    category: 'c',
    level: 'Easy',
    code: `int day = 1;
switch (day) {
    case 1: cout << "Monday ";
    case 2: cout << "Tuesday ";
    default: cout << "Some day";
}`,
    options: [
      'switch can\'t use int',
      'Missing break statements cause fall-through',
      'default must come first',
      'cout needs printf',
    ],
    answer: 1,
    explanation:
      'Without break, execution falls through to the next cases. It prints "Monday Tuesday Some day". Add break; after each case.',
    meme: 'switch without break: "Why stop at Monday when you can have the whole week?" 📅',
  },
  {
    id: 'logic-average',
    category: 'logic',
    level: 'Beginner',
    code: `marks = [80, 90, 70]
total = 0
for m in marks:
    total += m

average = total / 2
print("Average:", average)`,
    options: [
      'total should start at 1',
      'Dividing by 2 instead of the number of marks',
      'for loops can\'t add numbers',
      'print needs an f-string',
    ],
    answer: 1,
    explanation:
      'There are 3 marks, but the code divides by 2, giving 120 instead of 80. Use len(marks) so it works for any list.',
    meme: 'No error. No warning. Just confidently wrong. 📉',
  },
  {
    id: 'logic-leap-year',
    category: 'logic',
    level: 'Medium',
    code: `def is_leap(year):
    return year % 4 == 0

print(is_leap(1900))   # expected False`,
    options: [
      'Modulo doesn\'t work on years',
      'It ignores the century rules (÷100 and ÷400)',
      'The function should print, not return',
      '1900 is too old for Python',
    ],
    answer: 1,
    explanation:
      'Years divisible by 100 aren\'t leap years unless they\'re also divisible by 400. Correct: (y % 4 == 0 and y % 100 != 0) or y % 400 == 0.',
    meme: 'The code works for 99% of years. The other 1% is why we have bug reports. 🗓️',
  },
  {
    id: 'logic-off-by-one',
    category: 'logic',
    level: 'Easy',
    code: `// print numbers 1 to 10
for (let i = 1; i < 10; i++) {
  console.log(i);
}`,
    options: [
      'let should be var',
      'i < 10 stops at 9, so 10 is never printed',
      'Loops can\'t start at 1',
      'console.log needs a string',
    ],
    answer: 1,
    explanation:
      'The loop runs while i < 10, so it stops after 9. Use i <= 10. This is the classic off-by-one error.',
    meme: 'There are 2 hard problems in programming: naming things, cache invalidation and off-by-one errors. 🤓',
  },
  {
    id: 'git-markers',
    category: 'git',
    level: 'Beginner',
    code: `<<<<<<< HEAD
const theme = "dark";
=======
const theme = "light";
>>>>>>> feature/theme-toggle`,
    options: [
      'The file is corrupted and must be deleted',
      'A merge conflict: choose a version and remove the markers',
      'Git added comments that are safe to leave',
      'You need to run git push --force',
    ],
    answer: 1,
    explanation:
      'Both branches changed the same line. Keep the version you want (or combine them), delete the <<<<<<<, ======= and >>>>>>> lines, then git add and commit.',
    meme: 'Two branches enter. One line leaves. ⚔️',
  },
  {
    id: 'git-commit-secret',
    category: 'git',
    level: 'Easy',
    code: `$ git add .
$ git commit -m "add login"
$ git push
! [remote rejected] (push declined: Push cannot contain secrets)`,
    options: [
      'GitHub is down',
      'A file with an API key (like .env) was committed',
      'The commit message is too short',
      'You need to pull first',
    ],
    answer: 1,
    explanation:
      'git add . picked up a secrets file. Add .env to .gitignore, remove it from the commit (not just in a new commit), and rotate the key.',
    meme: '"git add ." — the most dangerous 10 characters in software. 🔑',
  },
  {
    id: 'git-detached',
    category: 'git',
    level: 'Medium',
    code: `$ git checkout 3fc07b8
You are in 'detached HEAD' state...
$ git commit -m "fix navbar"
$ git switch main
Warning: you are leaving 1 commit behind`,
    options: [
      'The commit was pushed automatically',
      'The commit isn\'t on any branch and can get lost',
      'main was deleted',
      'Commits are impossible in detached HEAD',
    ],
    answer: 1,
    explanation:
      'Checking out a commit hash detaches HEAD, so new commits belong to no branch. Before switching, run git switch -c my-fix to keep them.',
    meme: 'Detached HEAD: when your code is as lost as you are. 🧭',
  },
];

// 1,000 more questions built by scripts/generateDebugBugs.js.
const GENERATED_BUGS = require('./debugBugsGenerated.json');

const ALL_BUGS = [...BUGS, ...GENERATED_BUGS];

module.exports = { BUG_CATEGORIES, BUGS: ALL_BUGS };
