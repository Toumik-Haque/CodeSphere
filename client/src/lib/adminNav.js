// Admin navigation entries, shared by the sidebar, the phone bar and the dashboard.

export const WORKSPACE = [
  { section: 'home', icon: 'bi-grid-1x2-fill', label: 'Dashboard', short: 'Home' },
  { section: 'events', icon: 'bi-calendar-event', label: 'Events', short: 'Events' },
  { section: 'users', icon: 'bi-person-lines-fill', label: 'Users', short: 'Users' },
  { section: 'attendance', icon: 'bi-clipboard-check', label: 'Attendance', short: 'Attendance' },
  { section: 'coreMembers', icon: 'bi-people', label: 'Team Members', short: 'Team' },
];

export const TOOLS = [
  { to: '/admin/hackathons', icon: 'bi-trophy', label: 'Hackathons', hint: 'Run hackathons, review submissions' },
  { to: '/admin/review', icon: 'bi-inbox', label: 'Hosted listings', hint: 'Approve student events & hackathons' },
  { to: '/admin/projects', icon: 'bi-kanban', label: 'Project Hub', hint: 'Review, publish and feature projects' },
  { to: '/admin/forum', icon: 'bi-shield-lock', label: 'Forum moderation', hint: 'Reports, actions, audit trail' },
  { to: '/admin/news', icon: 'bi-newspaper', label: 'Tech News', hint: 'Stories, sources and digests' },
  { to: '/admin/materials', icon: 'bi-journal-bookmark', label: 'Study Guide', hint: 'Write learning materials' },
  { to: '/admin/reverse-coding', icon: 'bi-arrow-repeat', label: 'Reverse Coding', hint: 'Author and publish challenges' },
];
