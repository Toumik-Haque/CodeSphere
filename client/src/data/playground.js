// Languages, examples and challenges for the CodeSphere Playground.
// `id` is the OneCompiler language slug used in https://onecompiler.com/embed/<id>.

export const LANGUAGES = [
  {
    id: 'python',
    label: 'Python',
    file: 'main.py',
    icon: 'bi-filetype-py',
    color: '#3776AB',
    tagline: 'Readable, beginner-friendly, everywhere in AI and data.',
  },
  {
    id: 'c',
    label: 'C',
    file: 'main.c',
    icon: 'bi-cpu',
    color: '#5C6BC0',
    tagline: 'The language that taught computers to talk.',
  },
  {
    id: 'cpp',
    label: 'C++',
    file: 'main.cpp',
    icon: 'bi-lightning-charge',
    color: '#00599C',
    tagline: 'Speed and STL: the competitive programmer\'s weapon.',
  },
  {
    id: 'java',
    label: 'Java',
    file: 'Main.java',
    icon: 'bi-cup-hot',
    color: '#E76F00',
    tagline: 'Write once, run anywhere. Powers Android and big systems.',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    file: 'index.js',
    icon: 'bi-filetype-js',
    color: '#D4A900',
    tagline: 'The language of the web, now on servers too.',
  },
  {
    id: 'go',
    label: 'Go',
    file: 'main.go',
    icon: 'bi-wind',
    color: '#00ADD8',
    tagline: 'Simple, fast and built for the cloud.',
  },
  {
    id: 'rust',
    label: 'Rust',
    file: 'main.rs',
    icon: 'bi-gear-wide-connected',
    color: '#B7410E',
    tagline: 'Memory-safe systems code without a garbage collector.',
  },
  {
    id: 'mysql',
    label: 'SQL',
    file: 'queries.sql',
    icon: 'bi-database',
    color: '#00758F',
    tagline: 'Ask questions to your data.',
  },
];

// Examples per language. The first one is loaded when the language opens.
export const EXAMPLES = {
  python: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'Print, variables and f-strings.',
      code: `name = "CodeSphere"
year = 2026

print(f"Hello, {name}! 👋")
print(f"Welcome to the {year} playground.")
`,
    },
    {
      title: 'Star Pyramid',
      level: 'Beginner',
      description: 'Nested loops that draw a pattern.',
      code: `rows = 5

for i in range(1, rows + 1):
    print(" " * (rows - i) + "*" * (2 * i - 1))
`,
    },
    {
      title: 'FizzBuzz',
      level: 'Easy',
      description: 'The classic interview warm-up.',
      code: `for n in range(1, 21):
    if n % 15 == 0:
        print("FizzBuzz")
    elif n % 3 == 0:
        print("Fizz")
    elif n % 5 == 0:
        print("Buzz")
    else:
        print(n)
`,
    },
    {
      title: 'Word Frequency',
      level: 'Medium',
      description: 'Dictionaries and sorting.',
      code: `text = "code learn build code share build code"

counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1

for word, count in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"{word:<6} {'█' * count} {count}")
`,
    },
  ],
  c: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'Your first C program.',
      code: `#include <stdio.h>

int main() {
    printf("Hello, CodeSphere!\\n");
    return 0;
}
`,
    },
    {
      title: 'Multiplication Table',
      level: 'Beginner',
      description: 'for loops and formatted output.',
      code: `#include <stdio.h>

int main() {
    int n = 7;
    for (int i = 1; i <= 10; i++) {
        printf("%d x %2d = %3d\\n", n, i, n * i);
    }
    return 0;
}
`,
    },
    {
      title: 'Swap with Pointers',
      level: 'Medium',
      description: 'See how pointers change values.',
      code: `#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 10, y = 20;
    printf("Before: x = %d, y = %d\\n", x, y);
    swap(&x, &y);
    printf("After:  x = %d, y = %d\\n", x, y);
    return 0;
}
`,
    },
  ],
  cpp: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'iostream basics.',
      code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, CodeSphere!" << endl;
    return 0;
}
`,
    },
    {
      title: 'Sort with STL',
      level: 'Easy',
      description: 'vector and sort in two lines.',
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> scores = {42, 7, 99, 15, 63};
    sort(scores.begin(), scores.end(), greater<int>());

    cout << "Leaderboard:" << endl;
    for (size_t i = 0; i < scores.size(); i++) {
        cout << i + 1 << ". " << scores[i] << endl;
    }
    return 0;
}
`,
    },
    {
      title: 'Binary Search',
      level: 'Medium',
      description: 'Find a number in O(log n).',
      code: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> a = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    cout << "23 found at index " << binarySearch(a, 23) << endl;
    return 0;
}
`,
    },
  ],
  java: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'Classes and main().',
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeSphere!");
    }
}
`,
    },
    {
      title: 'Reverse a String',
      level: 'Easy',
      description: 'StringBuilder in action.',
      code: `public class Main {
    public static void main(String[] args) {
        String word = "CodeSphere";
        String reversed = new StringBuilder(word).reverse().toString();
        System.out.println(word + " -> " + reversed);
    }
}
`,
    },
    {
      title: 'Student Records',
      level: 'Medium',
      description: 'Objects, lists and streams.',
      code: `import java.util.*;

public class Main {
    record Student(String name, int marks) {}

    public static void main(String[] args) {
        List<Student> students = List.of(
            new Student("Asha", 91),
            new Student("Rahul", 78),
            new Student("Meera", 85)
        );

        students.stream()
            .sorted((a, b) -> b.marks() - a.marks())
            .forEach(s -> System.out.println(s.name() + ": " + s.marks()));
    }
}
`,
    },
  ],
  javascript: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'console.log and template strings.',
      code: `const club = "CodeSphere";
console.log(\`Hello, \${club}! 🚀\`);
`,
    },
    {
      title: 'Array Magic',
      level: 'Easy',
      description: 'map, filter and reduce.',
      code: `const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const evens = nums.filter((n) => n % 2 === 0);
const squares = evens.map((n) => n * n);
const total = squares.reduce((sum, n) => sum + n, 0);

console.log("Evens:  ", evens);
console.log("Squares:", squares);
console.log("Total:  ", total);
`,
    },
    {
      title: 'Async Countdown',
      level: 'Medium',
      description: 'Promises and async/await.',
      code: `const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launch() {
  for (let i = 3; i > 0; i--) {
    console.log(i + "...");
    await wait(500);
  }
  console.log("🚀 Liftoff!");
}

launch();
`,
    },
  ],
  go: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'Packages and fmt.',
      code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, CodeSphere!")
}
`,
    },
    {
      title: 'Goroutines',
      level: 'Medium',
      description: 'Run tasks at the same time.',
      code: `package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    for i := 1; i <= 3; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            fmt.Printf("Worker %d done\\n", id)
        }(i)
    }
    wg.Wait()
    fmt.Println("All workers finished")
}
`,
    },
  ],
  rust: [
    {
      title: 'Hello, CodeSphere',
      level: 'Beginner',
      description: 'println! and variables.',
      code: `fn main() {
    let club = "CodeSphere";
    println!("Hello, {}! 🦀", club);
}
`,
    },
    {
      title: 'Fibonacci',
      level: 'Easy',
      description: 'Loops and mutable variables.',
      code: `fn main() {
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 0..10 {
        print!("{} ", a);
        let next = a + b;
        a = b;
        b = next;
    }
    println!();
}
`,
    },
  ],
  mysql: [
    {
      title: 'Club Members',
      level: 'Beginner',
      description: 'CREATE, INSERT and SELECT.',
      code: `CREATE TABLE members (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  role VARCHAR(30),
  points INT
);

INSERT INTO members VALUES
  (1, 'Asha', 'Lead', 320),
  (2, 'Rahul', 'Developer', 210),
  (3, 'Meera', 'Designer', 275),
  (4, 'Kabir', 'Developer', 190);

SELECT name, role, points
FROM members
ORDER BY points DESC;
`,
    },
    {
      title: 'Group & Count',
      level: 'Easy',
      description: 'Aggregate data with GROUP BY.',
      code: `CREATE TABLE events (name VARCHAR(50), type VARCHAR(20), attendees INT);

INSERT INTO events VALUES
  ('Code Sprint', 'Hackathon', 120),
  ('Git 101', 'Workshop', 60),
  ('Web Dev Day', 'Workshop', 85),
  ('Hack Night', 'Hackathon', 95);

SELECT type, COUNT(*) AS events, SUM(attendees) AS total_attendees
FROM events
GROUP BY type;
`,
    },
  ],
};

// Empty skeletons loaded when a student starts a challenge.
// (The challenges themselves live on the server with their expected output.)
export const STARTERS = {
  python: `# Write your solution below
`,
  c: `#include <stdio.h>

int main() {
    // Write your solution here

    return 0;
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here

    return 0;
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        // Write your solution here

    }
}
`,
  javascript: `// Write your solution below
`,
  go: `package main

import "fmt"

func main() {
    // Write your solution here
    fmt.Print("")
}
`,
  rust: `fn main() {
    // Write your solution here

}
`,
  mysql: `-- Write your query below
`,
};

export const TIPS = [
  'Stuck? Explain your code line by line to a friend, or a rubber duck. 🦆',
  'Read the error message from the top. It usually tells you the exact line.',
  'Small steps win: run your code after every few lines you write.',
  'Name variables for what they hold. Future you will say thanks.',
  'Every expert was once a beginner who refused to give up.',
  'Bugs are not failures. They are puzzles with a guaranteed answer.',
];
