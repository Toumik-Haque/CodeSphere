// Resume parsing (runs in the browser; also testable in Node).
//
// 1. PDF text items are rebuilt into real lines using their positions.
// 2. The text is split into sections by headings (Education, Projects…).
// 3. Each field is read from the most relevant section.

// ---------- PDF items → lines ----------

/**
 * pdf.js returns text pieces with positions. Joining them blindly turns a
 * whole page into one line, so group pieces that share a baseline (y) and
 * order them left to right.
 */
export function itemsToLines(items) {
  const rows = [];
  for (const item of items) {
    const str = item.str ?? '';
    if (!str.trim() && !item.hasEOL) continue;
    const [, , , , x = 0, y = 0] = item.transform || [];
    const height = Math.abs(item.transform?.[3] || item.height || 10);
    let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, height * 0.35));
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str, width: item.width || str.length * height * 0.5 });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((row) => {
    row.parts.sort((a, b) => a.x - b.x);
    let line = '';
    let lastEnd = null;
    for (const part of row.parts) {
      // Add a space when there's a visible gap between pieces.
      if (lastEnd !== null && part.x - lastEnd > 1 && !line.endsWith(' ') && !part.str.startsWith(' ')) line += ' ';
      line += part.str;
      lastEnd = part.x + part.width;
    }
    return line.replace(/\s+/g, ' ').trim();
  }).filter(Boolean).join('\n');
}

// ---------- helpers ----------

const BULLET = /^[•●▪◦‣■□➢➤►▸✓✔\-*–·]\s*/;
// Real links only: a scheme, www., or a well-known host (not "Node.js").
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s|,)]+|(?:github\.com|gitlab\.com|linkedin\.com|leetcode\.com|codechef\.com|codeforces\.com|hackerrank\.com|geeksforgeeks\.org|hackerearth\.com|[a-z0-9-]+\.(?:vercel\.app|netlify\.app|github\.io|onrender\.com|herokuapp\.com|web\.app|pages\.dev))(?:\/[^\s|,)]*)?)/gi;
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_RANGE = new RegExp(`\\(?\\s*(?:${MONTH}\\s*)?(?:19|20)\\d{2}\\s*(?:[-–—to]+\\s*(?:(?:${MONTH}\\s*)?(?:19|20)\\d{2}|present|current|now|ongoing))?\\s*\\)?`, 'gi');

const SECTION_NAMES = {
  education: /^(education(al)?( background| details| qualifications?)?|academics?|academic (background|details|qualifications?|profile)|qualifications?)$/,
  projects: /^((personal|academic|key|major|technical|selected|notable|side|college|team)\s+)?projects?( (undertaken|work|experience))?$/,
  experience: /^((work|professional|industry|relevant)\s+)?experience|internships?( experience)?|employment( history)?|work history$/,
  skills: /^((technical|key|core|programming|soft|it)\s+)?skills?( (&|and) (tools|technologies|interests|abilities))?|technologies|tech stack|tools( (&|and) technologies)?|competencies$/,
  achievements: /^(achievements?|awards?( (&|and) achievements)?|honou?rs?( (&|and) awards)?|accomplishments|certifications?( (&|and) (achievements|courses|awards))?|courses?( (&|and) certifications)?|licenses?)$/,
  activities: /^(extra[- ]?curricular( activities)?|activities|positions? of responsibility|leadership|volunteer(ing)?( experience)?|clubs?( (&|and) societies)?|co[- ]curricular( activities)?)$/,
  summary: /^(summary|professional summary|profile|about( me)?|objective|career objective|career summary)$/,
  other: /^(contact|contact (details|information)|personal (details|information)|languages|interests|hobbies|declaration|references|coursework|relevant coursework|publications|links)$/,
};

// Anchor each pattern as a whole line ("tech stack" alone is a heading,
// "Tech Stack: Python, Flask" is not).
const SECTION_RES = Object.fromEntries(Object.entries(SECTION_NAMES)
  .map(([name, re]) => [name, new RegExp(`^(?:${re.source.replace(/^\^/, '').replace(/\$$/, '')})$`)]));

function sectionOf(line) {
  if (/[,.]\s|\d/.test(line.replace(/[:\s]+$/, ''))) return null;
  const clean = line.toLowerCase().replace(/[^a-z&\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > 45) return null;
  for (const [name, re] of Object.entries(SECTION_RES)) if (re.test(clean)) return name;
  return null;
}

/** Split lines into { header: [...], education: [...], projects: [...], … }. */
export function splitSections(lines) {
  const sections = { header: [] };
  let current = 'header';
  for (const line of lines) {
    const name = sectionOf(line);
    if (name) {
      current = name;
      sections[current] = sections[current] || [];
      continue;
    }
    (sections[current] = sections[current] || []).push(line);
  }
  return sections;
}

const stripBullet = (s) => s.replace(BULLET, '').trim();
const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

// ---------- college ----------

const INSTITUTION = /\b(university|universit[äa]t|college|institute|institution|polytechnic|academy|vidyalaya|vidyapeeth|iit|nit|iiit|bits|school of [a-z]+)\b/i;
const SCHOOL_ONLY = /\b(high school|higher secondary|senior secondary|secondary school|public school|convent|class (x|xii|10|12)|cbse|icse|isc|hs|madhyamik)\b/i;

function cleanInstitution(line) {
  // Keep the piece that names the institution; drop dates, scores, degree.
  const pieces = line
    .replace(DATE_RANGE, ' | ')
    .split(/\s*[|•·;]\s*|\s+[–—]\s+|\s+-\s+|\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const index = pieces.findIndex((p) => INSTITUTION.test(p));
  if (index < 0) return '';
  let name = pieces[index]
    .replace(/\b(cgpa|gpa|sgpa|percentage|marks?|score)\b.*$/i, '')
    .replace(/^(b\.?\s?tech|b\.?\s?e|bca|b\.?\s?sc|m\.?\s?tech|mca|m\.?\s?sc|bachelor[^,]*|master[^,]*|diploma[^,]*)\s*(in [a-z &]+)?\s*(,|from|at)\s*/i, '')
    .replace(/[,\s]+$/, '')
    .trim();
  // "Indian Institute of Technology, Kharagpur": keep the short place part.
  const next = pieces[index + 1];
  if (next && !/,/.test(name) && /^[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?$/.test(next) && !INSTITUTION.test(next) && next.length <= 25 && !/\b(b\.?tech|cgpa|gpa)\b/i.test(next)) {
    name = `${name}, ${next}`;
  }
  return name.length >= 6 && name.length <= 120 ? name : '';
}

function findCollege(sections, lines) {
  const pools = [sections.education || [], sections.header || [], lines];
  for (const pool of pools) {
    const candidates = pool.filter((l) => INSTITUTION.test(l) && !SCHOOL_ONLY.test(l));
    for (const line of candidates) {
      const name = cleanInstitution(line);
      if (name) return name;
    }
  }
  return '';
}

// ---------- degree / department / years ----------

const DEGREES = [
  [/\bb\.?\s?tech(nology)?\b|bachelor of technology/i, 'B.Tech'],
  [/\bb\.?\s?e\.?\b(?!\w)|bachelor of engineering/i, 'B.E.'],
  [/\bb\.?\s?c\.?\s?a\b|bachelor of computer applications?/i, 'BCA'],
  [/\bb\.?\s?sc\b|bachelor of science/i, 'B.Sc'],
  [/\bm\.?\s?tech\b|master of technology/i, 'M.Tech'],
  [/\bm\.?\s?c\.?\s?a\b|master of computer applications?/i, 'MCA'],
  [/\bm\.?\s?sc\b|master of science/i, 'M.Sc'],
  [/\bdiploma\b/i, 'Diploma'],
];

const DEPARTMENT_ALIASES = [
  [/\b(artificial intelligence|a\.?i\.?\s*(&|and)\s*m\.?l|aiml|ai\s*&\s*ds|machine learning)\b/i, 'Artificial Intelligence'],
  [/\b(computer science( (and|&) engineering)?|c\.?s\.?e|computer engineering|cse)\b/i, 'Computer Science and Engineering'],
  [/\b(information technology|i\.?t\.?)\b(?!\s*(sector|industry))/, 'Information Technology'],
  [/\b(electronics (and|&) communication( engineering)?|e\.?c\.?e)\b/i, 'Electronics and Communication Engineering'],
  [/\b(electrical( and electronics)? engineering|e\.?e\.?e?)\b/i, 'Electrical Engineering'],
  [/\bmechanical( engineering)?\b|\bm\.?e\.?\b(?=\s*(department|dept|branch))/i, 'Mechanical Engineering'],
  [/\bcivil( engineering)?\b/i, 'Civil Engineering'],
];

function findDepartment(text, departments) {
  for (const [re, name] of DEPARTMENT_ALIASES) {
    if (re.test(text) && departments.includes(name)) return name;
  }
  return '';
}

function yearsIn(text) {
  return [...String(text).matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

// Year of study from the expected graduation year (4-year degree, July start).
function yearOfStudyFrom(gradYear, today = new Date()) {
  const lastYearStarts = today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear();
  const year = 4 - (gradYear - lastYearStarts);
  return year >= 1 && year <= 4 ? ['1st Year', '2nd Year', '3rd Year', '4th Year'][year - 1] : '';
}

// ---------- links / coding profiles ----------

const PROFILE_HOSTS = [
  [/github\.com\/([A-Za-z0-9-]+)\/?$/i, 'GitHub'],
  [/leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)\/?$/i, 'LeetCode'],
  [/codechef\.com\/users\/([A-Za-z0-9_]+)/i, 'CodeChef'],
  [/codeforces\.com\/profile\/([A-Za-z0-9_.-]+)/i, 'Codeforces'],
  [/hackerrank\.com\/(?:profile\/)?([A-Za-z0-9_]+)\/?$/i, 'HackerRank'],
  [/geeksforgeeks\.org\/(?:user|profile)\/([A-Za-z0-9_]+)/i, 'GeeksforGeeks'],
  [/hackerearth\.com\/@([A-Za-z0-9_]+)/i, 'HackerEarth'],
];

const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`).replace(/[.,;:]+$/, '');
const urlsIn = (text) => (String(text).match(URL_RE) || [])
  .filter((u) => !/@/.test(u))
  .map(normalizeUrl);

function findCodingProfiles(text) {
  const found = [];
  for (const url of urlsIn(text)) {
    for (const [re, platform] of PROFILE_HOSTS) {
      if (re.test(url.replace(/^https?:\/\/(www\.)?/i, '')) && !found.some((f) => f.platform === platform)) {
        found.push({ platform, url });
      }
    }
  }
  return found;
}

// ---------- projects ----------

function guessProjectType(text) {
  const t = text.toLowerCase();
  if (/\b(machine learning|deep learning|neural|tensorflow|pytorch|keras|scikit|nlp|llm|gpt|ai\b|artificial intelligence|computer vision|opencv|cnn|transformer)/.test(t)) return 'AI / ML';
  if (/\b(pandas|numpy|data analysis|data science|power bi|tableau|matplotlib|eda|visuali[sz]ation)/.test(t)) return 'Data Science';
  if (/\b(arduino|raspberry pi|iot|esp32|sensors?|robot|embedded)\b/.test(t)) return 'Other';
  if (/\b(android|ios|flutter|react native|kotlin|swift|mobile app)/.test(t)) return 'App Development';
  if (/\b(react|next\.?js|node|express|django|flask|html|css|javascript|typescript|mongodb|mern|website|web app|frontend|backend|full[- ]?stack|vue|angular|tailwind)/.test(t)) return 'Web Development';
  if (/\b(competitive programming|leetcode|codeforces|dsa|algorithm)/.test(t)) return 'Competitive Programming';
  return 'Other';
}

const TECH_LABEL = /^(tech(nologies|nology| stack)?|tools?( used)?|built with|stack|skills used)\s*[:\-–]\s*/i;

const countSkills = (text, skillOptions) => skillOptions.filter((skill) => {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zA-Z0-9+#])${escaped}([^a-zA-Z0-9+#]|$)`, skill.length <= 2 ? '' : 'i').test(text);
}).length;

// "React, Node.js, MongoDB" or "MERN" is a tech list; a sentence is not.
function isTechList(part, skillOptions) {
  if (/^(mern|mean|lamp|pern|jamstack)( stack)?$/i.test(part.trim())) return true;
  const items = part.split(/\s*[,/]\s*|\s+(?:and|&)\s+/).filter(Boolean);
  const shortItems = items.every((i) => i.split(/\s+/).length <= 3);
  return shortItems && countSkills(part, skillOptions) >= 1;
}

function parseTitleLine(line, skillOptions) {
  // "Smart Attendance System | React, Node.js | Jan 2024 – Mar 2024"
  // "CodeSphere – Student Coding Community | React, Node.js"
  // "Line Follower Robot: Arduino based robot using IR sensors."
  const withoutDates = line.replace(DATE_RANGE, ' ').replace(/\s+/g, ' ').trim();
  const colon = withoutDates.match(/^([^:]{3,80}):\s+(.+)$/);
  if (colon && !isTechList(colon[2], skillOptions)) {
    return { title: colon[1].trim(), techText: '', desc: colon[2].trim() };
  }
  const parts = withoutDates.split(/\s*[|•]\s*|\s+[–—]\s+|\s+-\s+|\s*:\s+/).map((p) => p.trim()).filter(Boolean);
  let title = (parts.shift() || '').replace(/[:\-–|]+$/, '').trim();
  const tech = [];
  for (const part of parts) {
    if (/^(github|live|demo|link|code|source|website)\b/i.test(part) || /^https?:/i.test(part)) continue;
    if (isTechList(part, skillOptions)) tech.push(part);
    else if (!tech.length) title = `${title} – ${part}`; // a subtitle, not technologies
  }
  return { title, techText: tech.join(', '), desc: '' };
}

function looksLikeTitle(line, prev) {
  if (BULLET.test(line)) return false;
  if (TECH_LABEL.test(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length > 16 || line.length > 120) return false;
  if (/^[a-z]/.test(line)) return false; // continues a sentence
  if (prev && /[,;]$|\band$|\bwith$|\bthe$/i.test(prev)) return false;
  return /[A-Za-z]/.test(line);
}

function findProjects(sections, skillOptions) {
  const lines = sections.projects || [];
  const projects = [];
  let current = null;
  let prev = '';

  const finish = () => {
    if (!current || !current.title) return;
    const block = `${current.title} ${current.techText} ${current.desc.join(' ')}`;
    const links = urlsIn(`${current.links.join(' ')} ${block}`);
    const github = links.find((u) => /github\.com\/[^/]+\/[^/]+/i.test(u)) || '';
    const demo = links.find((u) => u !== github && !/github\.com|linkedin\.com/i.test(u)) || '';
    let technologies = current.tech || current.techText;
    if (!technologies) {
      technologies = skillOptions.filter((skill) => {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i').test(block);
      }).join(', ');
    }
    projects.push({
      title: current.title.slice(0, 100),
      type: guessProjectType(block),
      technologies: technologies.replace(/\s+/g, ' ').slice(0, 160),
      github,
      demo,
      description: current.desc.join(' ').replace(URL_RE, '').replace(/\s+/g, ' ').trim().slice(0, 600),
    });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (TECH_LABEL.test(stripBullet(line)) && current) {
      current.tech = stripBullet(line).replace(TECH_LABEL, '').trim();
    } else if (/^(https?:\/\/|www\.|github\.com)/i.test(stripBullet(line)) || /^(github|link|live|demo)\s*[:\-–]/i.test(stripBullet(line))) {
      if (current) current.links.push(line);
    } else if (looksLikeTitle(line, prev) && (!current || current.desc.length > 0 || current.tech || /\s[|–—-]\s|\|/.test(line))) {
      finish();
      const { title, techText, desc } = parseTitleLine(line, skillOptions);
      current = { title, techText, tech: '', desc: desc ? [desc] : [], links: [] };
    } else if (current) {
      current.desc.push(stripBullet(line));
    } else {
      // Text before the first title: treat this line as a title anyway.
      const { title, techText, desc } = parseTitleLine(stripBullet(line), skillOptions);
      current = { title, techText, tech: '', desc: desc ? [desc] : [], links: [] };
    }
    prev = line;
  }
  finish();
  return projects.filter((p) => p.title.length >= 3).slice(0, 10);
}

// ---------- main ----------

export function parseResumeText(rawText, { departments = [], skillOptions = [], today = new Date() } = {}) {
  const text = String(rawText || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections = splitSections(lines);
  const education = (sections.education || []).join('\n');

  // Name: one of the first lines, letters only, 2-5 words.
  const name = lines.slice(0, 6).map((l) => l.replace(/[|•].*$/, '').trim()).find((l) => {
    const words = l.split(/\s+/);
    return /^[A-Za-z][A-Za-z .'-]+$/.test(l) && words.length >= 2 && words.length <= 5 && l.length <= 50 && !sectionOf(l);
  }) || '';

  const phone = (text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,12}/g) || [])
    .map((v) => v.replace(/\D/g, ''))
    .find((v) => v.length >= 10 && v.length <= 13 && !/^(19|20)\d{2}(19|20)\d{2}/.test(v)) || '';
  // "919876543210" → "+91 9876543210"
  const phoneFormatted = phone.length === 12 && phone.startsWith('91') ? `+91 ${phone.slice(2)}` : phone;

  const collegeName = findCollege(sections, lines);

  const degreeSource = education || text;
  const degree = (DEGREES.find(([re]) => re.test(degreeSource)) || [])[1] || '';
  const department = findDepartment(education || text, departments);

  // Graduation year: an explicit label, else the end of the college date range.
  let graduationYear = (text.match(/(?:expected\s+)?(?:year\s+of\s+)?(?:graduation|graduating|passing|completion)(?:\s+year)?\s*[:-]?\s*(?:in\s+)?((?:19|20)\d{2})/i) || [])[1] || '';
  if (!graduationYear) {
    const collegeLines = (sections.education || lines).filter((l, i, arr) => INSTITUTION.test(l) && !SCHOOL_ONLY.test(l)
      || (i > 0 && INSTITUTION.test(arr[i - 1]) && !SCHOOL_ONLY.test(arr[i - 1]))
      || /\b(b\.?\s?tech|b\.?\s?e|bca|b\.?\s?sc|m\.?\s?tech|mca|bachelor|master)\b/i.test(l));
    const years = yearsIn(collegeLines.join(' '));
    if (years.length) graduationYear = String(Math.max(...years));
  }

  const explicitYear = (text.match(/\b(1st|2nd|3rd|4th|first|second|third|fourth)\s+year\b/i) || [])[1];
  const yearMap = { first: '1st', second: '2nd', third: '3rd', fourth: '4th' };
  const yearOfStudy = explicitYear
    ? `${(yearMap[explicitYear.toLowerCase()] || explicitYear.toLowerCase())} Year`.replace(/^./, (c) => c.toUpperCase())
    : graduationYear ? yearOfStudyFrom(Number(graduationYear), today) : '';

  const skills = skillOptions.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-zA-Z0-9+#])${escaped}([^a-zA-Z0-9+#]|$)`, skill.length <= 2 ? '' : 'i').test(text);
  });

  const extracted = {
    name: titleCase(name.toLowerCase()).replace(/\s{2,}/g, ' '),
    phone: phoneFormatted,
    collegeName,
    degree,
    department,
    yearOfStudy,
    graduationYear,
    skills,
    projects: findProjects(sections, skillOptions),
    codingProfiles: findCodingProfiles(text),
  };

  return Object.fromEntries(Object.entries(extracted).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v))));
}
