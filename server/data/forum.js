// Forum categories, post types and moderation settings.
// `staffOnly` categories accept new threads only from admins.

const FORUM_CATEGORIES = [
  { id: 'programming', name: 'Programming & DSA', icon: 'bi-code-slash', description: 'Debugging help, algorithms, language questions, code reviews' },
  { id: 'projects', name: 'Projects & Hackathons', icon: 'bi-rocket-takeoff', description: 'Team formation, project feedback, event collaboration' },
  { id: 'ai', name: 'AI & Emerging Tech', icon: 'bi-cpu', description: 'AI tools, ML concepts, research, product ideas' },
  { id: 'careers', name: 'Internships & Careers', icon: 'bi-briefcase', description: 'Resume feedback, interview prep, opportunities and career questions' },
  { id: 'academics', name: 'Academics & Exams', icon: 'bi-journal-bookmark', description: 'Study groups, resources, subject discussions, exam preparation' },
  { id: 'campus', name: 'Campus Life', icon: 'bi-building', description: 'Clubs, events, facilities, student experiences and suggestions' },
  { id: 'open', name: 'Open Discussion', icon: 'bi-chat-dots', description: 'Books, hobbies, productivity, general questions and interests' },
  { id: 'announcements', name: 'Announcements', icon: 'bi-megaphone', description: 'Official CodeSphere updates', staffOnly: true },
];

const POST_TYPES = [
  { id: 'question', name: 'Question', icon: 'bi-question-circle', description: 'Ask for help; the best reply can be marked as the answer.' },
  { id: 'discussion', name: 'Discussion', icon: 'bi-chat-left-text', description: 'Invite opinions or compare approaches.' },
  { id: 'resource', name: 'Resource', icon: 'bi-bookmark-star', description: 'Share a course, article or repository with context.' },
  { id: 'opportunity', name: 'Opportunity', icon: 'bi-stars', description: 'Share a verified internship, event, competition or collaboration.' },
  { id: 'showcase', name: 'Showcase', icon: 'bi-trophy', description: 'Share a project or achievement.' },
  { id: 'announcement', name: 'Announcement', icon: 'bi-megaphone', description: 'Official posts from the CodeSphere team.', staffOnly: true },
];

const REACTION_TYPES = ['like', 'helpful', 'celebrate'];

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'privacy', label: 'Shares private information' },
  { id: 'misinformation', label: 'Misleading or false information' },
  { id: 'off-topic', label: 'Off-topic or wrong category' },
  { id: 'other', label: 'Something else' },
];

const LIMITS = {
  titleMin: 8,
  titleMax: 150,
  bodyMin: 10,
  threadBodyMax: 10000,
  replyBodyMax: 5000,
  maxTags: 5,
  tagMax: 24,
  // Authors can edit their own post/reply for this long after posting.
  editWindowMs: 30 * 60 * 1000,
  // Brand-new accounts (younger than this) can include fewer links.
  newAccountMs: 24 * 60 * 60 * 1000,
  newAccountMaxLinks: 2,
};

const GUIDELINES = [
  'Be kind and respectful. Disagree with ideas, not people.',
  'No harassment, hate speech, threats, impersonation or targeted abuse.',
  'Never share anyone\'s private information (phone, address, ID, private photos).',
  'No spam, advertising or repeated copy-paste posts.',
  'Use the right category and a clear title so others can find and help.',
  'Share sources for opportunities and claims. No illegal content.',
  'Report problems instead of replying to them. Moderators review every report.',
];

module.exports = { FORUM_CATEGORIES, POST_TYPES, REACTION_TYPES, REPORT_REASONS, LIMITS, GUIDELINES };
