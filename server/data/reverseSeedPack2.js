// Reverse Coding pack 2: 10 challenges (Beginner → Intermediate).
// Load with: node scripts/seedReverseChallenges.js --pack=reverseSeedPack2

const code = (src) => `\`\`\`\n${src.trim()}\n\`\`\``;

const STAIRCASE = `n = int(input())

for i in range(1, n + 1):
    print(" " * (n - i) + "#" * i)`;

const DIGITS = `n = input().strip()
print(sum(int(digit) for digit in n))`;

const EVEN_ODD = `n = int(input())

if n % 2 == 0:
    print("Even")
else:
    print("Odd")`;

const MIRROR = `s = input().strip()
print(s[::-1])`;

const MAXIMUM = `n = int(input())
arr = list(map(int, input().split()))

print(max(arr))`;

const FIZZBUZZ = `n = int(input())

for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`;

const PALINDROME = `s = input().strip()

if s == s[::-1]:
    print("YES")
else:
    print("NO")`;

const SUM = `n = int(input())
arr = list(map(int, input().split()))

print(sum(arr))`;

const PRIME = `n = int(input())

if n < 2:
    print("Not Prime")
else:
    prime = True

    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            prime = False
            break

    print("Prime" if prime else "Not Prime")`;

const SECOND = `n = int(input())
arr = list(map(int, input().split()))

unique_values = sorted(set(arr), reverse=True)

print(unique_values[1])`;

const t = (input, output, hidden = true) => ({ input, output, hidden });
const fizz = (n) => Array.from({ length: n }, (_, i) => {
  const k = i + 1;
  if (k % 15 === 0) return 'FizzBuzz';
  if (k % 3 === 0) return 'Fizz';
  if (k % 5 === 0) return 'Buzz';
  return String(k);
}).join('\n');

module.exports = [
  {
    slug: 'star-staircase',
    title: 'Star Staircase',
    format: 'pattern',
    level: 'Beginner',
    topic: 'Loops',
    tags: ['loops', 'patterns'],
    points: 15,
    estMinutes: 10,
    statement: 'The program draws a right-aligned staircase using # characters. Study the examples carefully, including the spaces on the left, and reproduce the pattern for any given n.',
    inputFormat: 'One integer n.',
    outputFormat: 'Print n lines forming a right-aligned staircase.',
    constraints: '1 ≤ n ≤ 50',
    examples: [{ input: '3', output: '  #\n ##\n###' }, { input: '1', output: '#' }],
    hints: ['Each row contains a different number of # characters.', 'The first row has n-1 spaces.', 'The number of spaces decreases as the number of # characters increases.'],
    editorial: `The program uses a loop from 1 to n. For each row, it prints n-i spaces followed by i hash characters. This creates a right-aligned staircase.\n\n${code(STAIRCASE)}`,
    tests: [t('3', '  #\n ##\n###', false), t('1', '#', false), t('5', '    #\n   ##\n  ###\n ####\n#####'), t('2', ' #\n##'), t('4', '   #\n  ##\n ###\n####')],
    outputPolicy: 'exact',
    reference: STAIRCASE,
  },
  {
    slug: 'digit-detective',
    title: 'Digit Detective',
    format: 'io',
    level: 'Beginner',
    topic: 'Mathematics',
    tags: ['math', 'loops', 'digits'],
    points: 15,
    estMinutes: 10,
    statement: 'A mysterious program reads a number and prints a single value calculated from its digits. Observe the examples and discover what the program calculates.',
    inputFormat: 'One integer n.',
    outputFormat: 'One integer.',
    constraints: '0 ≤ n ≤ 10⁹',
    examples: [{ input: '123', output: '6' }, { input: '505', output: '10' }],
    hints: ['Look at every digit separately.', 'Try adding all the digits.', 'The order of the digits does not matter.'],
    editorial: `The program extracts each digit from the input number and adds them together. For example, 123 produces 1 + 2 + 3 = 6.\n\n${code(DIGITS)}`,
    tests: [t('123', '6', false), t('9', '9', false), t('0', '0'), t('1000000000', '1'), t('99999', '45'), t('4567', '22')],
    outputPolicy: 'trim',
    reference: DIGITS,
  },
  {
    slug: 'even-or-odd-detective',
    title: 'Even or Odd Detective',
    format: 'logic',
    level: 'Beginner',
    topic: 'Conditionals',
    tags: ['math', 'conditionals'],
    points: 10,
    estMinutes: 5,
    statement: 'A program examines a given integer and prints a message based on a hidden mathematical property. Reproduce its behaviour.',
    inputFormat: 'One integer n.',
    outputFormat: 'Print either Even or Odd.',
    constraints: '-10⁹ ≤ n ≤ 10⁹',
    examples: [{ input: '8', output: 'Even' }, { input: '13', output: 'Odd' }],
    hints: ['Think about how numbers can be divided by 2.', 'Check whether the remainder is zero.', 'Negative numbers follow the same rule.'],
    editorial: `An integer is even if it is divisible by 2 without leaving a remainder. Otherwise, it is odd.\n\n${code(EVEN_ODD)}`,
    tests: [t('8', 'Even', false), t('13', 'Odd', false), t('0', 'Even'), t('-7', 'Odd'), t('-12', 'Even'), t('1000000000', 'Even')],
    outputPolicy: 'trim',
    reference: EVEN_ODD,
  },
  {
    slug: 'the-reverse-mirror',
    title: 'The Reverse Mirror',
    format: 'io',
    level: 'Beginner',
    topic: 'Strings',
    tags: ['strings'],
    points: 15,
    estMinutes: 10,
    statement: 'A program takes a word and produces a mysterious transformed version of it. Observe the examples and recreate the same transformation.',
    inputFormat: 'One word containing only lowercase English letters.',
    outputFormat: 'Print the transformed word.',
    constraints: '1 ≤ length ≤ 100',
    examples: [{ input: 'hello', output: 'olleh' }, { input: 'coding', output: 'gnidoc' }],
    hints: ['Compare the first and last characters.', 'The last character becomes the first.', 'Think about reversing a string.'],
    editorial: `The program reverses the input string. Each character moves to the opposite position, so the last character becomes the first.\n\n${code(MIRROR)}`,
    tests: [t('hello', 'olleh', false), t('coding', 'gnidoc', false), t('a', 'a'), t('racecar', 'racecar'), t('python', 'nohtyp'), t('programming', 'gnimmargorp')],
    outputPolicy: 'trim',
    reference: MIRROR,
  },
  {
    slug: 'the-hidden-maximum',
    title: 'The Hidden Maximum',
    format: 'algorithm',
    level: 'Beginner',
    topic: 'Arrays',
    tags: ['arrays', 'math'],
    points: 20,
    estMinutes: 15,
    statement: 'A program receives a list of integers and prints one number. Your task is to discover which number it selects from the list.',
    inputFormat: 'First line: integer n. Second line: n space-separated integers.',
    outputFormat: 'Print one integer.',
    constraints: '1 ≤ n ≤ 1000, -10⁶ ≤ aᵢ ≤ 10⁶',
    examples: [{ input: '5\n3 8 2 10 4', output: '10' }, { input: '4\n-5 -2 -9 -1', output: '-1' }],
    hints: ['Compare all the numbers.', 'Look for the number that is greater than or equal to every other number.', 'Remember that all numbers can be negative.'],
    editorial: `The program finds the maximum value in the given array: every element is compared and the largest value is printed.\n\n${code(MAXIMUM)}`,
    tests: [t('5\n3 8 2 10 4', '10', false), t('4\n-5 -2 -9 -1', '-1', false), t('1\n42', '42'), t('5\n7 7 7 7 7', '7'), t('6\n-10 -20 -30 -1 -50 -4', '-1'), t('5\n100 200 300 400 500', '500')],
    outputPolicy: 'trim',
    reference: MAXIMUM,
  },
  {
    slug: 'fizzbuzz-mystery',
    title: 'FizzBuzz Mystery',
    format: 'logic',
    level: 'Beginner',
    topic: 'Conditionals',
    tags: ['loops', 'conditionals'],
    points: 20,
    estMinutes: 15,
    statement: 'A program reads an integer n and prints a sequence of results from 1 to n. Some numbers are replaced with special words. Study the examples to discover the rules.',
    inputFormat: 'One integer n.',
    outputFormat: 'Print one result per line.',
    constraints: '1 ≤ n ≤ 100',
    examples: [{ input: '5', output: fizz(5) }, { input: '15', output: fizz(15) }],
    hints: ['Some numbers are replaced instead of being printed.', 'Check divisibility by 3 and 5.', 'What happens when a number is divisible by both?'],
    editorial: `The program checks every integer from 1 to n. Multiples of 3 become Fizz, multiples of 5 become Buzz, and multiples of both become FizzBuzz. All remaining numbers are printed normally.\n\n${code(FIZZBUZZ)}`,
    tests: [t('5', fizz(5), false), t('15', fizz(15), false), t('1', fizz(1)), t('3', fizz(3)), t('10', fizz(10))],
    outputPolicy: 'trim',
    reference: FIZZBUZZ,
  },
  {
    slug: 'palindrome-hunter',
    title: 'Palindrome Hunter',
    format: 'io',
    level: 'Beginner',
    topic: 'Strings',
    tags: ['strings', 'logic'],
    points: 20,
    estMinutes: 15,
    statement: 'A program examines a given word and prints YES or NO. Your task is to identify the property it checks.',
    inputFormat: 'One lowercase word.',
    outputFormat: 'Print YES or NO.',
    constraints: '1 ≤ length ≤ 1000',
    examples: [{ input: 'madam', output: 'YES' }, { input: 'hello', output: 'NO' }],
    hints: ['Compare the first and last characters.', 'Continue comparing characters from both ends.', 'What happens if the word reads the same in both directions?'],
    editorial: `The program checks whether the input string is equal to its reverse. If both are identical, the word is a palindrome and the program prints YES.\n\n${code(PALINDROME)}`,
    tests: [t('madam', 'YES', false), t('hello', 'NO', false), t('a', 'YES'), t('racecar', 'YES'), t('level', 'YES'), t('python', 'NO'), t('abba', 'YES')],
    outputPolicy: 'trim',
    reference: PALINDROME,
  },
  {
    slug: 'the-missing-sum',
    title: 'The Missing Sum',
    format: 'algorithm',
    level: 'Intermediate',
    topic: 'Arrays',
    tags: ['arrays', 'math'],
    points: 25,
    estMinutes: 20,
    statement: 'A program receives a sequence of integers and prints a single number. Work out what that number represents.',
    inputFormat: 'First line: integer n. Second line: n space-separated integers.',
    outputFormat: 'One integer.',
    constraints: '1 ≤ n ≤ 1000, -10⁶ ≤ aᵢ ≤ 10⁶',
    examples: [{ input: '5\n1 2 3 4 5', output: '15' }, { input: '4\n10 -2 5 -3', output: '10' }],
    hints: ['Start with a total of zero.', 'Visit every element in the list.', 'Add each element to the total.'],
    editorial: `The program calculates the sum of all elements in the array. It starts with zero and adds each number to the running total.\n\n${code(SUM)}`,
    tests: [t('5\n1 2 3 4 5', '15', false), t('4\n10 -2 5 -3', '10', false), t('1\n100', '100'), t('5\n0 0 0 0 0', '0'), t('4\n-1 -2 -3 -4', '-10'), t('6\n10 20 30 40 50 60', '210')],
    outputPolicy: 'trim',
    reference: SUM,
  },
  {
    slug: 'prime-or-not',
    title: 'Prime or Not?',
    format: 'logic',
    level: 'Intermediate',
    topic: 'Number Theory',
    tags: ['math', 'number-theory'],
    points: 25,
    estMinutes: 20,
    statement: 'A program reads an integer and decides whether it belongs to a special category of numbers. It prints Prime or Not Prime. Recreate its behaviour.',
    inputFormat: 'One integer n.',
    outputFormat: 'Print Prime or Not Prime.',
    constraints: '0 ≤ n ≤ 10⁶',
    examples: [{ input: '7', output: 'Prime' }, { input: '10', output: 'Not Prime' }],
    hints: ['A prime number has exactly two positive divisors.', 'Check whether any number other than 1 and itself divides the input.', 'Remember that 0 and 1 are not prime numbers.'],
    editorial: `A prime number is greater than 1 and has no positive divisors other than 1 and itself. The program checks divisibility from 2 up to the square root of the number; if a divisor is found, the number is not prime.\n\n${code(PRIME)}`,
    tests: [t('7', 'Prime', false), t('10', 'Not Prime', false), t('1', 'Not Prime'), t('2', 'Prime'), t('0', 'Not Prime'), t('97', 'Prime'), t('100', 'Not Prime'), t('999983', 'Prime')],
    outputPolicy: 'trim',
    reference: PRIME,
  },
  {
    slug: 'second-largest-mystery',
    title: 'Second Largest Mystery',
    format: 'algorithm',
    level: 'Intermediate',
    topic: 'Sorting',
    tags: ['arrays', 'sorting', 'logic'],
    points: 30,
    estMinutes: 25,
    statement: 'A program receives a list of integers and prints one value. It is not the largest number. Figure out which value it picks, and watch out for duplicates.',
    inputFormat: 'First line: integer n. Second line: n space-separated integers (at least two distinct values).',
    outputFormat: 'Print one integer.',
    constraints: '2 ≤ n ≤ 1000, -10⁶ ≤ aᵢ ≤ 10⁶',
    examples: [{ input: '5\n10 20 30 40 50', output: '40' }, { input: '6\n5 5 8 8 10 10', output: '8' }],
    hints: ['First identify the largest number.', 'Ignore duplicate occurrences of the largest number.', 'Find the next greatest distinct value.'],
    editorial: `The program removes duplicate values using a set, sorts the remaining values in descending order, and prints the element at index 1: the second-largest distinct value.\n\n${code(SECOND)}`,
    tests: [t('5\n10 20 30 40 50', '40', false), t('6\n5 5 8 8 10 10', '8', false), t('2\n1 2', '1'), t('5\n100 90 80 70 60', '90'), t('5\n5 5 5 4 4', '4'), t('4\n-1 -5 -3 -2', '-2'), t('6\n10 20 10 30 30 25', '25')],
    outputPolicy: 'trim',
    reference: SECOND,
  },
];
