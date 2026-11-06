// Playground coding challenges. `expected` is the exact output a correct
// solution prints. Outputs are compared after normalising (see
// routes/challengeRoutes.js): case-insensitive, and any whitespace or line
// breaks count as one space, so "True", "true" and one-item-per-line all pass.
// Never change an existing `id`: solved progress is stored by id.

const CHALLENGES = [
  {
    id: 'even-odd',
    title: 'Even or Odd?',
    level: 'Beginner',
    xp: 10,
    description: 'For each number from 1 to 10, print "<n> is even" or "<n> is odd", one per line.',
    example: '1 is odd\n2 is even\n3 is odd\n...\n10 is even',
    hint: 'Use the modulo operator: n % 2 == 0 means even.',
    expected: Array.from({ length: 10 }, (_, i) => `${i + 1} is ${(i + 1) % 2 ? 'odd' : 'even'}`).join('\n'),
  },
  {
    id: 'sum-digits',
    title: 'Sum of Digits',
    level: 'Beginner',
    xp: 10,
    description: 'Print the sum of the digits of 98765 (just the number).',
    example: '35',
    hint: 'Repeatedly take n % 10 for the last digit, then n / 10 to drop it.',
    expected: '35',
  },
  {
    id: 'palindrome',
    title: 'Palindrome Checker',
    level: 'Easy',
    xp: 20,
    description: 'Check "racecar", then "codesphere". Print true or false for each, on separate lines.',
    example: 'true\nfalse',
    hint: 'Compare characters from both ends moving inwards, or reverse the string.',
    expected: 'true\nfalse',
  },
  {
    id: 'primes',
    title: 'Prime Hunter',
    level: 'Easy',
    xp: 20,
    description: 'Print every prime number below 50, separated by spaces.',
    example: '2 3 5 7 11 ...',
    hint: 'A number is prime if nothing from 2 up to its square root divides it.',
    expected: '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47',
  },
  {
    id: 'vowels',
    title: 'Vowel Counter',
    level: 'Easy',
    xp: 20,
    description: 'Print how many vowels are in "Learn together, build together".',
    example: 'a single number',
    hint: 'Loop through each character and check if it is in "aeiouAEIOU".',
    expected: '10',
  },
  {
    id: 'anagram',
    title: 'Anagram Detective',
    level: 'Medium',
    xp: 30,
    description: 'Print true if "listen" and "silent" are anagrams, otherwise false.',
    example: 'true or false',
    hint: 'Sort the letters of both words and compare, or count each letter.',
    expected: 'true',
  },
  {
    id: 'matrix',
    title: 'Matrix Transpose',
    level: 'Medium',
    xp: 30,
    description: 'Transpose [[1,2,3],[4,5,6],[7,8,9]] and print it, one row per line, numbers separated by spaces.',
    example: '1 2 3      1 4 7\n4 5 6  ->  2 5 8\n7 8 9      3 6 9',
    hint: 'The element at row i, column j moves to row j, column i.',
    expected: '1 4 7\n2 5 8\n3 6 9',
  },
  {
    id: 'brackets',
    title: 'Balanced Brackets',
    level: 'Hard',
    xp: 50,
    description: 'Check "{[()()]}", then "{[(])}". Print true or false for each, on separate lines.',
    example: 'true\nfalse',
    hint: 'Push opening brackets onto a stack; each closing bracket must match the top.',
    expected: 'true\nfalse',
  },
];

module.exports = { CHALLENGES };
