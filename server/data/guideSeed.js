// Starter Study Guide pages (loaded by scripts/seedStudyGuides.js).
// Topics match the Reverse Coding starter challenges so they link up.
// Every Python example is checked by the seed script before saving.

module.exports = [
  {
    slug: 'python-basics-input-output',
    title: 'Python Basics: Input and Output',
    topic: 'Basics',
    level: 'Beginner',
    order: 1,
    estMinutes: 10,
    tags: ['python', 'print', 'input'],
    summary: 'Read input, convert it to numbers and print results exactly the way a problem asks.',
    body: `Most coding challenges follow the same shape: **read input, compute something, print the answer**. Getting input and output exactly right is half the battle.

**Printing**
print() writes a line of text. Separate several values with commas and Python adds a space between them.
\`\`\`
print("Hello, CodeSphere!")
print("Score:", 42)
\`\`\`

**Reading input**
input() always returns a **string**, even if the user typed a number. Convert it before doing maths.
\`\`\`
age = int(input())
print(age + 1)
\`\`\`

**Several values on one line**
Use split() to break a line into parts, then map() to convert each part.
\`\`\`
a, b = map(int, input().split())
print(a + b)
\`\`\`

**Common mistakes**
- Forgetting int(): "5" + 1 is an error in Python.
- Printing extra words like "Answer:" when the problem wants only the number.
- Wrong capital letters or spacing: challenges compare your output exactly.`,
    resources: [
      { title: 'Python tutorial: input and output', url: 'https://docs.python.org/3/tutorial/inputoutput.html', kind: 'docs' },
      { title: 'Built-in functions: input(), print(), int()', url: 'https://docs.python.org/3/library/functions.html', kind: 'docs' },
    ],
    examples: [{ code: 'a, b = map(int, input().split())\nprint(a + b)', input: '3 4', output: '7' }],
  },
  {
    slug: 'conditions-if-elif-else',
    title: 'Making Decisions with if, elif and else',
    topic: 'Conditions',
    level: 'Beginner',
    order: 2,
    estMinutes: 10,
    tags: ['python', 'if-else', 'modulo'],
    summary: 'Use comparisons, if/elif/else and the modulo operator to choose what your program does.',
    body: `Programs make decisions with **if** statements. The block under the first true condition runs, and the rest are skipped.

\`\`\`
n = int(input())
if n % 2 == 0:
    print("Even")
else:
    print("Odd")
\`\`\`

**The modulo operator %**
n % k is the remainder after dividing n by k. It's perfect for "every 3rd", "even or odd" and "divisible by" checks.

**Order matters with elif**
Python checks conditions top to bottom and stops at the first true one. Put the most specific check first, as in FizzBuzz, where "divisible by 15" must come before "divisible by 3".
\`\`\`
for i in range(1, 16):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
\`\`\`

**Comparing values**
Use == to compare and = to assign. Combine conditions with and / or, and remember a value can't be both below 0 **and** above 100.`,
    resources: [
      { title: 'Python tutorial: if statements', url: 'https://docs.python.org/3/tutorial/controlflow.html#if-statements', kind: 'docs' },
    ],
    examples: [{ code: 'n = int(input())\nif n % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")', input: '7', output: 'Odd' }],
  },
  {
    slug: 'loops-and-patterns',
    title: 'Loops and Patterns',
    topic: 'Loops',
    level: 'Beginner',
    order: 3,
    estMinutes: 15,
    tags: ['python', 'loops', 'patterns'],
    summary: 'Repeat work with for and while loops, and build text patterns row by row.',
    body: `A **for** loop repeats a block for each item in a sequence. range(a, b) gives the numbers from a up to, but **not including**, b.

\`\`\`
for i in range(1, 4):
    print(i)
\`\`\`

**Off-by-one errors**
range(1, n) stops at n - 1. To include n, use range(1, n + 1). This is the most common loop bug.

**Building patterns**
Think about each row on its own: how many spaces, then how many symbols? Multiplying a string repeats it: " " * 3 is three spaces.
\`\`\`
n = 3
for i in range(1, n + 1):
    print(" " * (n - i) + "#" * i)
\`\`\`
This prints a right-aligned staircase. Leading spaces matter in pattern challenges.

**Joining numbers with spaces**
" ".join(...) puts exactly one space between items, with none at the end.
\`\`\`
print(" ".join(str(x) for x in range(1, 5)))
\`\`\``,
    resources: [
      { title: 'Python tutorial: for statements and range()', url: 'https://docs.python.org/3/tutorial/controlflow.html#for-statements', kind: 'docs' },
    ],
    examples: [{ code: 'n = int(input())\nfor i in range(1, n + 1):\n    print(" " * (n - i) + "#" * i)', input: '3', output: '  #\n ##\n###' }],
  },
  {
    slug: 'working-with-strings',
    title: 'Working with Strings',
    topic: 'Strings',
    level: 'Beginner',
    order: 4,
    estMinutes: 15,
    tags: ['python', 'strings'],
    summary: 'Split, join, reverse, count and transform text, and learn why strings can\'t be changed in place.',
    body: `Strings are sequences of characters. You can loop over them, index them and slice them.

**Splitting and joining**
\`\`\`
words = "learn build grow".split()
print(" ".join(reversed(words)))
\`\`\`

**Counting characters**
\`\`\`
text = "CodeSphere"
print(sum(1 for ch in text if ch in "aeiouAEIOU"))
\`\`\`

**Strings are immutable**
You can't change one character with text[0] = "X". Build a new string instead, for example with a list of characters and "".join(...).

**Character codes**
ord("a") gives 97 and chr(97) gives "a". With % 26 you can shift letters and wrap around the alphabet, which is the idea behind a Caesar cipher.`,
    resources: [
      { title: 'Python tutorial: text and strings', url: 'https://docs.python.org/3/tutorial/introduction.html#text', kind: 'docs' },
      { title: 'String methods reference', url: 'https://docs.python.org/3/library/stdtypes.html#string-methods', kind: 'docs' },
    ],
    examples: [{ code: 'text = input()\nprint(sum(1 for ch in text if ch in "aeiouAEIOU"))', input: 'CodeSphere', output: '4' }],
  },
  {
    slug: 'lists-and-arrays',
    title: 'Lists, Sorting and Sets',
    topic: 'Arrays',
    level: 'Intermediate',
    order: 5,
    estMinutes: 15,
    tags: ['python', 'lists', 'sorting'],
    summary: 'Store many values in lists, sort them, remove duplicates with sets and avoid index errors.',
    body: `A **list** holds many values in order. Indexes start at **0**, and the last item is list[-1].

**Reading a list of numbers**
\`\`\`
values = list(map(int, input().split()))
\`\`\`

**Sorting**
sorted(values) returns a new sorted list. values.sort() sorts in place and returns None, so don't write x = values.sort().

**Removing duplicates**
A set keeps each value once. Combine it with sorting to find, say, the second largest **distinct** value:
\`\`\`
values = sorted(set([4, 9, 2, 9, 7]))
print(values[-2] if len(values) >= 2 else -1)
\`\`\`

**Avoid these bugs**
- list[len(list)] is out of range; the last index is len(list) - 1.
- Removing items from a list while looping over it skips items. Build a new list instead.`,
    resources: [
      { title: 'Python tutorial: more on lists', url: 'https://docs.python.org/3/tutorial/datastructures.html#more-on-lists', kind: 'docs' },
      { title: 'Sorting how-to', url: 'https://docs.python.org/3/howto/sorting.html', kind: 'docs' },
    ],
    examples: [{ code: 'values = sorted(set(map(int, input().split())))\nprint(values[-2] if len(values) >= 2 else -1)', input: '4 9 2 9 7', output: '7' }],
  },
  {
    slug: 'stacks-explained',
    title: 'Stacks: Last In, First Out',
    topic: 'Stacks',
    level: 'Intermediate',
    order: 6,
    estMinutes: 15,
    tags: ['python', 'stack', 'data-structures'],
    summary: 'Use a stack to solve matching problems like balanced brackets.',
    body: `A **stack** is like a pile of plates: you add to the top and take from the top. In Python, a list works as a stack with append() and pop().

**Balanced brackets**
Push every opening bracket. When you see a closing bracket, the top of the stack must be its partner. At the end, the stack must be empty.
\`\`\`
pairs = {")": "(", "]": "[", "}": "{"}
stack = []
ok = True
for ch in "{[()()]}":
    if ch in "([{":
        stack.append(ch)
    elif not stack or stack.pop() != pairs[ch]:
        ok = False
        break
print("YES" if ok and not stack else "NO")
\`\`\`

**Where else stacks appear**
Undo/redo, the browser back button, evaluating expressions and depth-first search all use stacks.`,
    resources: [
      { title: 'Python tutorial: using lists as stacks', url: 'https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-stacks', kind: 'docs' },
    ],
    examples: [{ code: 'pairs = {")": "(", "]": "[", "}": "{"}\nstack = []\nok = True\nfor ch in input().strip():\n    if ch in "([{":\n        stack.append(ch)\n    elif not stack or stack.pop() != pairs[ch]:\n        ok = False\n        break\nprint("YES" if ok and not stack else "NO")', input: '{[(])}', output: 'NO' }],
  },
  {
    slug: 'debugging-like-a-pro',
    title: 'Debugging Like a Pro',
    topic: 'Debugging',
    level: 'Beginner',
    order: 7,
    estMinutes: 10,
    tags: ['debugging', 'errors'],
    summary: 'Read error messages, test small pieces and find bugs faster.',
    body: `Every developer writes bugs. Good developers find them quickly.

**1. Read the error from the bottom**
Python's last line names the error type (NameError, TypeError, IndexError…) and the message. The lines above show where it happened.

**2. Reproduce with a tiny input**
Use the smallest input that still shows the problem. It's much easier to reason about.

**3. Print what you assume**
Add print() calls to check the values you believe are there. Most bugs are a wrong assumption.

**4. Check the usual suspects**
- Off-by-one loops: range(1, n) vs range(1, n + 1).
- Integer vs string: input() returns a string.
- Wrong divisor: dividing by a fixed number instead of len(list).
- Formatting: f"{value:.2f}" always shows two decimal places.
\`\`\`
numbers = [80, 90, 70]
print(f"{sum(numbers) / len(numbers):.2f}")
\`\`\`

**5. Explain it to a rubber duck**
Say what each line does out loud. You'll often hear the bug before you finish.`,
    resources: [
      { title: 'Python tutorial: errors and exceptions', url: 'https://docs.python.org/3/tutorial/errors.html', kind: 'docs' },
    ],
    examples: [{ code: 'numbers = list(map(int, input().split()))\nprint(f"{sum(numbers) / len(numbers):.2f}")', input: '80 90 70', output: '80.00' }],
  },
  {
    slug: 'git-and-github-basics',
    title: 'Git and GitHub Basics',
    topic: 'Git',
    level: 'Beginner',
    order: 8,
    estMinutes: 20,
    tags: ['git', 'github', 'open-source'],
    summary: 'Track your code with Git and collaborate on GitHub: commits, branches, pushes and pull requests.',
    body: `**Git** records snapshots of your project. **GitHub** hosts Git projects online so people can collaborate.

**The everyday loop**
\`\`\`
git status
git add file.py
git commit -m "fix: handle empty input"
git push
\`\`\`

**Branches**
A branch is a separate line of work. Create one for each change so main stays stable.
\`\`\`
git checkout -b feature/search-bar
\`\`\`

**Pull requests**
Push your branch, then open a pull request on GitHub so others can review and merge it. Link the issue it fixes, for example "Closes #12".

**Staying in sync**
\`\`\`
git pull upstream main
\`\`\`

**Never commit secrets**
Keep API keys in .env files and list them in .gitignore. If a secret is committed, remove it from the history and change the key.

Ready to try it for real? Follow the step-by-step contribution guide on the Open Source page.`,
    resources: [
      { title: 'Pro Git book (free)', url: 'https://git-scm.com/book/en/v2', kind: 'docs' },
      { title: 'GitHub: contributing to a project', url: 'https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project', kind: 'docs' },
    ],
    examples: [],
  },
];
