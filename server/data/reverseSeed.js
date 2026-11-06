// Starter set of Reverse Coding challenges (Python first, as the plan
// recommends). Loaded by scripts/seedReverseChallenges.js.
// Each reference solution is checked against every test by that script.

const py = (s) => s.replace(/^\n/, '');

module.exports = [
  {
    slug: 'hello-codesphere',
    title: 'Hello, CodeSphere',
    format: 'output',
    level: 'Beginner',
    topic: 'Basics',
    tags: ['print'],
    points: 10,
    estMinutes: 3,
    statement: 'Write a program that prints exactly the three lines shown in the expected output. There is no input.',
    outputFormat: 'Three lines of text, exactly as shown.',
    examples: [{ input: '', output: 'Hello, CodeSphere!\nLearn. Build. Grow.\n2026', explanation: 'Match every character, including the punctuation.' }],
    hints: ['Use one print() per line.', 'Check capital letters and punctuation carefully.'],
    editorial: 'print("Hello, CodeSphere!")\nprint("Learn. Build. Grow.")\nprint(2026)\n\nOutput reconstruction is about matching text exactly. Spaces and punctuation count.',
    tests: [
      { input: '', output: 'Hello, CodeSphere!\nLearn. Build. Grow.\n2026', hidden: false },
      { input: '', output: 'Hello, CodeSphere!\nLearn. Build. Grow.\n2026', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
print("Hello, CodeSphere!")
print("Learn. Build. Grow.")
print(2026)
`),
  },
  {
    slug: 'sum-of-two',
    title: 'Sum of Two',
    format: 'io',
    level: 'Beginner',
    topic: 'Basics',
    tags: ['input', 'math'],
    points: 10,
    estMinutes: 5,
    statement: 'Look at the examples and work out what the program does with its input. Then write a program that does the same for any input.',
    inputFormat: 'One line with two integers separated by a space.',
    outputFormat: 'One integer.',
    constraints: '-10^9 ≤ each number ≤ 10^9',
    examples: [
      { input: '3 4', output: '7' },
      { input: '-5 12', output: '7', explanation: 'Negative numbers work too.' },
    ],
    hints: ['Read the line with input() and split it.', 'Convert each part with int() before adding.'],
    editorial: 'a, b = map(int, input().split())\nprint(a + b)',
    tests: [
      { input: '3 4', output: '7', hidden: false },
      { input: '-5 12', output: '7', hidden: false },
      { input: '0 0', output: '0', hidden: true },
      { input: '1000000000 1000000000', output: '2000000000', hidden: true },
      { input: '-7 -8', output: '-15', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
a, b = map(int, input().split())
print(a + b)
`),
  },
  {
    slug: 'even-or-odd',
    title: 'Even or Odd',
    format: 'io',
    level: 'Beginner',
    topic: 'Conditions',
    tags: ['if-else', 'modulo'],
    points: 10,
    estMinutes: 5,
    statement: 'Given a number, the program prints one word. Figure out the rule from the examples.',
    inputFormat: 'One integer n.',
    outputFormat: 'Even or Odd.',
    constraints: '-10^9 ≤ n ≤ 10^9',
    examples: [
      { input: '4', output: 'Even' },
      { input: '7', output: 'Odd' },
    ],
    hints: ['n % 2 tells you the remainder after dividing by 2.'],
    editorial: 'n = int(input())\nprint("Even" if n % 2 == 0 else "Odd")\n\nZero is even, and in Python -3 % 2 is 1, so negatives work too.',
    tests: [
      { input: '4', output: 'Even', hidden: false },
      { input: '7', output: 'Odd', hidden: false },
      { input: '0', output: 'Even', hidden: true },
      { input: '-3', output: 'Odd', hidden: true },
      { input: '1000000000', output: 'Even', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
n = int(input())
print("Even" if n % 2 == 0 else "Odd")
`),
  },
  {
    slug: 'star-staircase',
    title: 'Star Staircase',
    format: 'pattern',
    level: 'Beginner',
    topic: 'Loops',
    tags: ['patterns', 'loops'],
    points: 15,
    estMinutes: 10,
    statement: 'Given a size n, the program draws a right-aligned staircase. Study the examples, including the spaces on the left, and reproduce the pattern for any n.',
    inputFormat: 'One integer n.',
    outputFormat: 'n lines forming a right-aligned staircase of # characters.',
    constraints: '1 ≤ n ≤ 50',
    examples: [
      { input: '3', output: '  #\n ##\n###' },
      { input: '1', output: '#' },
    ],
    hints: ['Line i has (n - i) spaces, then i # characters.', 'In Python, " " * 3 gives three spaces.'],
    editorial: 'n = int(input())\nfor i in range(1, n + 1):\n    print(" " * (n - i) + "#" * i)\n\nLeading spaces matter in pattern challenges; only trailing spaces are ignored.',
    tests: [
      { input: '3', output: '  #\n ##\n###', hidden: false },
      { input: '1', output: '#', hidden: false },
      { input: '5', output: '    #\n   ##\n  ###\n ####\n#####', hidden: true },
      { input: '2', output: ' #\n##', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
n = int(input())
for i in range(1, n + 1):
    print(" " * (n - i) + "#" * i)
`),
  },
  {
    slug: 'number-triangle',
    title: 'Number Triangle',
    format: 'pattern',
    level: 'Beginner',
    topic: 'Loops',
    tags: ['patterns', 'nested-loops'],
    points: 15,
    estMinutes: 10,
    statement: 'Given n, the program prints a triangle of numbers. Work out how each row is built.',
    inputFormat: 'One integer n.',
    outputFormat: 'n lines; numbers on a line are separated by single spaces.',
    constraints: '1 ≤ n ≤ 30',
    examples: [{ input: '4', output: '1\n1 2\n1 2 3\n1 2 3 4' }],
    hints: ['Row i contains the numbers 1 to i.', '" ".join(...) puts single spaces between items.'],
    editorial: 'n = int(input())\nfor i in range(1, n + 1):\n    print(" ".join(str(x) for x in range(1, i + 1)))',
    tests: [
      { input: '4', output: '1\n1 2\n1 2 3\n1 2 3 4', hidden: false },
      { input: '1', output: '1', hidden: true },
      { input: '6', output: '1\n1 2\n1 2 3\n1 2 3 4\n1 2 3 4 5\n1 2 3 4 5 6', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
n = int(input())
for i in range(1, n + 1):
    print(" ".join(str(x) for x in range(1, i + 1)))
`),
  },
  {
    slug: 'reverse-the-words',
    title: 'Reverse the Words',
    format: 'io',
    level: 'Beginner',
    topic: 'Strings',
    tags: ['strings', 'split'],
    points: 15,
    estMinutes: 8,
    statement: 'The program reads a sentence and prints it back changed. Compare inputs and outputs to find the rule.',
    inputFormat: 'One line of words separated by single spaces.',
    outputFormat: 'The transformed line.',
    constraints: '1 ≤ number of words ≤ 100',
    examples: [
      { input: 'learn build grow', output: 'grow build learn' },
      { input: 'CodeSphere rocks', output: 'rocks CodeSphere' },
    ],
    hints: ['The letters inside each word don\'t change, only the word order.', 'Try split(), reversed() and join().'],
    editorial: 'words = input().split()\nprint(" ".join(reversed(words)))',
    tests: [
      { input: 'learn build grow', output: 'grow build learn', hidden: false },
      { input: 'CodeSphere rocks', output: 'rocks CodeSphere', hidden: false },
      { input: 'single', output: 'single', hidden: true },
      { input: 'a b c d e', output: 'e d c b a', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
words = input().split()
print(" ".join(reversed(words)))
`),
  },
  {
    slug: 'vowel-counter',
    title: 'Vowel Counter',
    format: 'io',
    level: 'Beginner',
    topic: 'Strings',
    tags: ['strings', 'counting'],
    points: 15,
    estMinutes: 8,
    statement: 'The program reads a line of text and prints a single number. What is it counting?',
    inputFormat: 'One line of text.',
    outputFormat: 'One integer.',
    constraints: 'Length ≤ 1000',
    examples: [
      { input: 'CodeSphere', output: '4' },
      { input: 'AEIOU xyz', output: '5', explanation: 'Capital letters count too.' },
    ],
    hints: ['Check each character against "aeiouAEIOU".'],
    editorial: 'text = input()\nprint(sum(1 for ch in text if ch in "aeiouAEIOU"))',
    tests: [
      { input: 'CodeSphere', output: '4', hidden: false },
      { input: 'AEIOU xyz', output: '5', hidden: false },
      { input: 'rhythm', output: '0', hidden: true },
      { input: 'Learn together, build together', output: '10', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
text = input()
print(sum(1 for ch in text if ch in "aeiouAEIOU"))
`),
  },
  {
    slug: 'fizzbuzz-up-to-n',
    title: 'FizzBuzz up to N',
    format: 'io',
    level: 'Intermediate',
    topic: 'Conditions',
    tags: ['loops', 'modulo'],
    points: 20,
    estMinutes: 10,
    statement: 'Given n, the program prints n lines. Some numbers are replaced by words. Find all the rules from the example.',
    inputFormat: 'One integer n.',
    outputFormat: 'n lines.',
    constraints: '1 ≤ n ≤ 1000',
    examples: [{ input: '15', output: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' }],
    hints: ['Look at which numbers become Fizz, Buzz and FizzBuzz.', 'Check the FizzBuzz case first.'],
    editorial: 'n = int(input())\nfor i in range(1, n + 1):\n    if i % 15 == 0: print("FizzBuzz")\n    elif i % 3 == 0: print("Fizz")\n    elif i % 5 == 0: print("Buzz")\n    else: print(i)',
    tests: [
      { input: '15', output: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', hidden: false },
      { input: '1', output: '1', hidden: true },
      { input: '5', output: '1\n2\nFizz\n4\nBuzz', hidden: true },
      { input: '30', output: Array.from({ length: 30 }, (_, k) => { const i = k + 1; return i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : String(i); }).join('\n'), hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
n = int(input())
for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`),
  },
  {
    slug: 'second-largest',
    title: 'Second Largest',
    format: 'algorithm',
    level: 'Intermediate',
    topic: 'Arrays',
    tags: ['arrays', 'sorting'],
    points: 25,
    estMinutes: 15,
    statement: 'The program reads a list of numbers and prints one value. Notice what happens with repeated numbers and when there is no answer.',
    inputFormat: 'First line: n. Second line: n integers separated by spaces.',
    outputFormat: 'One integer: the answer, or -1 if there is none.',
    constraints: '1 ≤ n ≤ 10^5, values fit in a 32-bit integer',
    examples: [
      { input: '5\n4 9 2 9 7', output: '7', explanation: '9 is the largest; repeated 9s don\'t count twice.' },
      { input: '3\n5 5 5', output: '-1', explanation: 'All values are equal, so there is no second largest.' },
    ],
    hints: ['Remove duplicates first.', 'You need two distinct values for an answer.'],
    editorial: 'n = int(input())\nvalues = sorted(set(map(int, input().split())))\nprint(values[-2] if len(values) >= 2 else -1)',
    tests: [
      { input: '5\n4 9 2 9 7', output: '7', hidden: false },
      { input: '3\n5 5 5', output: '-1', hidden: false },
      { input: '1\n42', output: '-1', hidden: true },
      { input: '4\n-1 -5 -3 -1', output: '-3', hidden: true },
      { input: '6\n1 2 3 4 5 6', output: '5', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
n = int(input())
values = sorted(set(map(int, input().split())))
print(values[-2] if len(values) >= 2 else -1)
`),
  },
  {
    slug: 'balanced-brackets',
    title: 'Balanced Brackets',
    format: 'algorithm',
    level: 'Intermediate',
    topic: 'Stacks',
    tags: ['stack', 'strings'],
    points: 30,
    estMinutes: 20,
    statement: 'The program reads a string of brackets and answers YES or NO. Work out when the answer is YES.',
    inputFormat: 'One line containing only the characters ()[]{}.',
    outputFormat: 'YES or NO.',
    constraints: '1 ≤ length ≤ 10^4',
    examples: [
      { input: '{[()()]}', output: 'YES' },
      { input: '{[(])}', output: 'NO', explanation: 'The brackets close in the wrong order.' },
      { input: '((', output: 'NO' },
    ],
    hints: ['Every closing bracket must match the most recent unmatched opening bracket.', 'A stack (list with append/pop) is perfect for this.'],
    editorial: 'Push opening brackets; on a closing bracket, the top of the stack must be its partner. At the end the stack must be empty.',
    tests: [
      { input: '{[()()]}', output: 'YES', hidden: false },
      { input: '{[(])}', output: 'NO', hidden: false },
      { input: '((', output: 'NO', hidden: true },
      { input: '()[]{}', output: 'YES', hidden: true },
      { input: ')(', output: 'NO', hidden: true },
      { input: '[([]{})]', output: 'YES', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
s = input().strip()
pairs = {')': '(', ']': '[', '}': '{'}
stack = []
ok = True
for ch in s:
    if ch in '([{':
        stack.append(ch)
    elif not stack or stack.pop() != pairs[ch]:
        ok = False
        break
print("YES" if ok and not stack else "NO")
`),
  },
  {
    slug: 'fix-the-average',
    title: 'Fix the Average',
    format: 'bug',
    level: 'Beginner',
    topic: 'Debugging',
    tags: ['debugging', 'math'],
    points: 15,
    estMinutes: 10,
    statement: 'The starter code is supposed to print the average of the numbers, rounded to 2 decimal places, but it gives the wrong answer. Fix it so it matches the expected behaviour.',
    inputFormat: 'First line: n. Second line: n integers.',
    outputFormat: 'The average with exactly 2 decimal places.',
    constraints: '1 ≤ n ≤ 1000',
    examples: [
      { input: '3\n80 90 70', output: '80.00' },
      { input: '2\n1 2', output: '1.50' },
    ],
    starterCode: {
      python: 'n = int(input())\nnumbers = list(map(int, input().split()))\ntotal = 0\nfor x in numbers:\n    total += x\naverage = total / 2\nprint(average)\n',
    },
    hints: ['Look at what the total is divided by.', 'Use f"{value:.2f}" to always show two decimal places.'],
    editorial: 'Two bugs: it divides by 2 instead of n, and it doesn\'t format to 2 decimal places.\nprint(f"{total / n:.2f}")',
    tests: [
      { input: '3\n80 90 70', output: '80.00', hidden: false },
      { input: '2\n1 2', output: '1.50', hidden: false },
      { input: '1\n7', output: '7.00', hidden: true },
      { input: '4\n1 2 3 5', output: '2.75', hidden: true },
    ],
    outputPolicy: 'trim',
    reference: py(`
n = int(input())
numbers = list(map(int, input().split()))
total = 0
for x in numbers:
    total += x
print(f"{total / n:.2f}")
`),
  },
  {
    slug: 'secret-shift',
    title: 'Secret Shift',
    format: 'logic',
    level: 'Intermediate',
    topic: 'Strings',
    tags: ['strings', 'ascii', 'cipher'],
    points: 25,
    estMinutes: 15,
    statement: 'The program reads a number k and a message, and prints a coded message. Study how each letter changes, and what happens at the end of the alphabet.',
    inputFormat: 'First line: k. Second line: the message.',
    outputFormat: 'The coded message.',
    constraints: '0 ≤ k ≤ 100; the message has letters, digits, spaces and punctuation',
    examples: [
      { input: '1\nabc', output: 'bcd' },
      { input: '3\nXyz, Hi!', output: 'Abc, Kl!', explanation: 'Letters wrap around after z; case and other characters stay the same.' },
    ],
    hints: ['Only letters change, by k positions.', 'Use ord() and chr(), and % 26 to wrap around.'],
    editorial: 'For each letter, shift (ord(ch) - base + k) % 26 + base, with base = ord("a") or ord("A"). Leave other characters unchanged.',
    tests: [
      { input: '1\nabc', output: 'bcd', hidden: false },
      { input: '3\nXyz, Hi!', output: 'Abc, Kl!', hidden: false },
      { input: '0\nNo Change', output: 'No Change', hidden: true },
      { input: '26\nWrap', output: 'Wrap', hidden: true },
      { input: '13\nHello, World 2026', output: 'Uryyb, Jbeyq 2026', hidden: true },
    ],
    outputPolicy: 'exact',
    reference: py(`
k = int(input())
text = input()
out = []
for ch in text:
    if ch.islower():
        out.append(chr((ord(ch) - 97 + k) % 26 + 97))
    elif ch.isupper():
        out.append(chr((ord(ch) - 65 + k) % 26 + 65))
    else:
        out.append(ch)
print("".join(out))
`),
  },
];
