// CodeSphere badges and developer levels.
//
// type:
//   auto        earned automatically from tracked activity
//   self        auto, but based on data the student reports (shown as such)
//   admin       given by an admin from the Admin dashboard
//   coming-soon shown locked until the feature exists
//
// For auto/self badges, `metric` names a value in the stats object built by
// utils/badges.js and `target` is the value needed. Never change an existing
// `id`: earned badges are stored by id.

const BADGE_GROUPS = [
  { id: 'start', label: 'Getting started', icon: 'bi-flower1' },
  { id: 'debugging', label: 'Debugging', icon: 'bi-bug' },
  { id: 'specialist', label: 'Bug specialist', icon: 'bi-compass' },
  { id: 'challenges', label: 'Challenges', icon: 'bi-code-square' },
  { id: 'consistency', label: 'Consistency', icon: 'bi-calendar-check' },
  { id: 'growth', label: 'Growth', icon: 'bi-graph-up-arrow' },
  { id: 'events', label: 'Events', icon: 'bi-calendar-event' },
  { id: 'reverse', label: 'Reverse Coding', icon: 'bi-arrow-repeat' },
  { id: 'opensource', label: 'Open source', icon: 'bi-github' },
  { id: 'community', label: 'Community', icon: 'bi-people' },
];

const BADGES = [
  // Getting started
  { id: 'first-step', group: 'start', emoji: '🌱', name: 'First Step', type: 'auto', metric: 'xp', target: 1, how: 'Earn your first XP: fix a daily bug or solve a challenge.' },
  { id: 'identity', group: 'start', emoji: '🪪', name: 'Identity', type: 'self', metric: 'profileComplete', target: 1, how: 'Complete your profile to 100%.' },

  // Debugging Arena (tiers)
  { id: 'first-fix', group: 'debugging', emoji: '🐞', name: 'First Fix', tier: 'bronze', type: 'auto', metric: 'bugsFixed', target: 1, how: 'Fix your first daily bug.' },
  { id: 'bug-hunter', group: 'debugging', emoji: '🐛', name: 'Bug Hunter', tier: 'silver', type: 'auto', metric: 'bugsFixed', target: 10, how: 'Fix 10 daily bugs.' },
  { id: 'bug-detective', group: 'debugging', emoji: '🕵️', name: 'Bug Detective', tier: 'gold', type: 'auto', metric: 'bugsFixed', target: 50, how: 'Fix 50 daily bugs.' },
  { id: 'bug-exterminator', group: 'debugging', emoji: '🏆', name: 'Bug Exterminator', tier: 'legend', type: 'auto', metric: 'bugsFixed', target: 100, how: 'Fix 100 daily bugs.' },

  // Bug specialist (10 correct fixes in one category)
  { id: 'python-tamer', group: 'specialist', emoji: '🐍', name: 'Python Tamer', type: 'auto', metric: 'fixed_python', target: 10, how: 'Fix 10 Python bugs.' },
  { id: 'js-juggler', group: 'specialist', emoji: '⚡', name: 'JS Juggler', type: 'auto', metric: 'fixed_javascript', target: 10, how: 'Fix 10 JavaScript bugs.' },
  { id: 'c-commander', group: 'specialist', emoji: '⚙️', name: 'C Commander', type: 'auto', metric: 'fixed_c', target: 10, how: 'Fix 10 C/C++ bugs.' },
  { id: 'logic-master', group: 'specialist', emoji: '🧠', name: 'Logic Master', type: 'auto', metric: 'fixed_logic', target: 10, how: 'Fix 10 logical-error bugs.' },
  { id: 'git-guru', group: 'specialist', emoji: '🐙', name: 'Git Guru', type: 'auto', metric: 'fixed_git', target: 10, how: 'Fix 10 Git bugs.' },

  // Coding challenges
  { id: 'first-program', group: 'challenges', emoji: '💻', name: 'First Program', type: 'self', metric: 'challengesSolved', target: 1, how: 'Solve your first coding challenge.' },
  { id: 'problem-solver', group: 'challenges', emoji: '🧩', name: 'Problem Solver', type: 'self', metric: 'challengesSolved', target: 4, how: 'Solve 4 coding challenges.' },
  { id: 'challenge-master', group: 'challenges', emoji: '👑', name: 'Challenge Master', type: 'self', metric: 'challengesSolved', target: 8, how: 'Solve all 8 coding challenges.' },
  { id: 'polyglot', group: 'challenges', emoji: '🌍', name: 'Polyglot', type: 'self', metric: 'challengeLanguages', target: 3, how: 'Solve challenges in 3 different languages.' },

  // Consistency (never punishes a missed day)
  { id: 'on-fire', group: 'consistency', emoji: '🔥', name: 'On Fire', tier: 'bronze', type: 'auto', metric: 'bestStreak', target: 3, how: 'Reach a 3-day streak (your best streak counts, so you never lose it).' },
  { id: 'week-warrior', group: 'consistency', emoji: '⚡', name: 'Week Warrior', tier: 'silver', type: 'auto', metric: 'bestStreak', target: 7, how: 'Reach a 7-day streak.' },
  { id: 'month-master', group: 'consistency', emoji: '🏅', name: 'Month Master', tier: 'gold', type: 'auto', metric: 'bestStreak', target: 30, how: 'Reach a 30-day streak.' },
  { id: 'regular', group: 'consistency', emoji: '🗓️', name: 'Regular', type: 'auto', metric: 'fixDays', target: 20, how: 'Fix the daily bug on 20 different days, in any order.' },
  { id: 'comeback-kid', group: 'consistency', emoji: '🔁', name: 'Comeback Kid', type: 'auto', metric: 'comebacks', target: 1, how: 'Come back and fix a bug after a break of 3 or more days. Welcome back!' },
  { id: 'weekend-coder', group: 'consistency', emoji: '🌙', name: 'Weekend Coder', type: 'auto', metric: 'weekends', target: 4, how: 'Fix bugs on 4 different weekends.' },

  // Growth
  { id: 'sharpshooter', group: 'growth', emoji: '🎯', name: 'Sharpshooter', type: 'auto', metric: 'sharpshooter', target: 1, how: 'Keep 80%+ accuracy over at least 10 daily bugs.' },
  { id: 'level-up', group: 'growth', emoji: '📈', name: 'Level Up', type: 'auto', metric: 'improved', target: 1, how: 'Get more of your last 10 daily bugs right than your first 10.' },
  { id: 'century', group: 'growth', emoji: '💯', name: 'Century', tier: 'bronze', type: 'auto', metric: 'xp', target: 100, how: 'Earn 100 XP.' },
  { id: 'xp-rocket', group: 'growth', emoji: '🚀', name: 'XP Rocket', tier: 'silver', type: 'auto', metric: 'xp', target: 500, how: 'Earn 500 XP.' },
  { id: 'xp-diamond', group: 'growth', emoji: '💎', name: 'XP Diamond', tier: 'gold', type: 'auto', metric: 'xp', target: 1000, how: 'Earn 1,000 XP.' },

  // Events (attendance marked by admins)
  { id: 'first-event', group: 'events', emoji: '🎟️', name: 'First Event', type: 'auto', metric: 'eventsAttended', target: 1, how: 'Attend your first CodeSphere event.' },
  { id: 'event-regular', group: 'events', emoji: '🎪', name: 'Event Regular', type: 'auto', metric: 'eventsAttended', target: 5, how: 'Attend 5 CodeSphere events.' },
  { id: 'workshop-warrior', group: 'events', emoji: '🛠️', name: 'Workshop Warrior', type: 'auto', metric: 'workshops', target: 3, how: 'Attend 3 workshops.' },
  { id: 'hackathon-hero', group: 'events', emoji: '🏆', name: 'Hackathon Hero', type: 'auto', metric: 'hackathons', target: 1, how: 'Take part in a hackathon.' },
  { id: 'community-member', group: 'events', emoji: '🤝', name: 'Community Member', type: 'auto', metric: 'meetups', target: 1, how: 'Attend a community meetup.' },

  // Reverse Coding (accepted submissions, checked by the server)
  { id: 'reverse-engineer', group: 'reverse', emoji: '🔄', name: 'Reverse Engineer', tier: 'bronze', type: 'auto', metric: 'reverseSolved', target: 1, how: 'Solve your first Reverse Coding challenge.' },
  { id: 'code-archaeologist', group: 'reverse', emoji: '🧬', name: 'Code Archaeologist', tier: 'silver', type: 'auto', metric: 'reverseSolved', target: 5, how: 'Solve 5 Reverse Coding challenges.' },
  { id: 'master-reconstructor', group: 'reverse', emoji: '🏛️', name: 'Master Reconstructor', tier: 'gold', type: 'auto', metric: 'reverseSolved', target: 10, how: 'Solve 10 Reverse Coding challenges.' },

  // Open source (not tracked yet)
  { id: 'first-merge', group: 'opensource', emoji: '🌟', name: 'First Merge', type: 'coming-soon', how: 'Get your first pull request merged into CodeSphere.' },
  { id: 'maintainers-friend', group: 'opensource', emoji: '🔧', name: "Maintainer's Friend", type: 'coming-soon', how: 'Get 5 pull requests merged into CodeSphere.' },
  { id: 'docs-hero', group: 'opensource', emoji: '📚', name: 'Docs Hero', type: 'coming-soon', how: 'Get a documentation pull request merged.' },
  { id: 'git-master', group: 'opensource', emoji: '🐙', name: 'Git Master', type: 'coming-soon', how: 'Complete the Git & GitHub learning path.' },

  // Community: forum (rewards helpful answers, not post volume)
  { id: 'conversation-starter', group: 'community', emoji: '💬', name: 'Conversation Starter', type: 'auto', metric: 'forumPosts', target: 1, how: 'Start a discussion or reply in the forum.' },
  { id: 'helpful-hand', group: 'community', emoji: '🤲', name: 'Helpful Hand', type: 'auto', metric: 'acceptedAnswers', target: 1, how: 'Have one of your forum replies accepted as the answer to someone else\'s question.' },
  { id: 'go-to-helper', group: 'community', emoji: '🌟', name: 'Go-To Helper', tier: 'gold', type: 'auto', metric: 'acceptedAnswers', target: 5, how: 'Have 5 of your forum replies accepted as answers.' },

  // Community (given by admins)
  { id: 'community-mentor', group: 'community', emoji: '🧑‍🏫', name: 'Community Mentor', type: 'admin', how: 'Help other students learn. Given by an admin.' },
  { id: 'builder', group: 'community', emoji: '🛠️', name: 'Builder', type: 'admin', how: 'Complete and showcase your first project. Given by an admin.' },
  { id: 'collaborator', group: 'community', emoji: '🤝', name: 'Collaborator', type: 'admin', how: 'Take part in a team project. Given by an admin.' },
  { id: 'speaker', group: 'community', emoji: '🎤', name: 'Speaker', type: 'admin', how: 'Run a session or talk for the club. Given by an admin.' },
  { id: 'designer', group: 'community', emoji: '🎨', name: 'Designer', type: 'admin', how: 'Contribute UI or design work. Given by an admin.' },
];

// Developer levels by total XP. Levels never go down (XP never decreases).
const LEVELS = [
  { name: 'Newbie', emoji: '🥚', minXp: 0 },
  { name: 'Explorer', emoji: '🧭', minXp: 50 },
  { name: 'Apprentice', emoji: '🔧', minXp: 150 },
  { name: 'Intermediate Developer', emoji: '💻', minXp: 400 },
  { name: 'Advanced Developer', emoji: '🚀', minXp: 900 },
  { name: 'Expert', emoji: '🧠', minXp: 1600 },
  { name: 'CodeSphere Legend', emoji: '👑', minXp: 2500 },
];

const MAX_SHOWCASE = 3;

module.exports = { BADGE_GROUPS, BADGES, LEVELS, MAX_SHOWCASE };
