// Project Hub funnel analytics. Fire-and-forget: tracking never breaks a request.
const { ProjectEvent } = require('../models/Project');

const EVENTS = new Set([
  'project_hub_viewed', 'github_import_started', 'github_import_succeeded', 'github_import_failed',
  'project_draft_created', 'project_submitted', 'project_published', 'guided_project_started',
  'milestone_completed', 'project_update_created', 'project_demo_clicked', 'github_source_clicked',
]);

function track(name, { user, project, guided, meta } = {}) {
  if (!EVENTS.has(name)) return;
  ProjectEvent.create({ name, user: user || undefined, project: project || undefined, guided: guided || undefined, meta: meta || {} })
    .catch((error) => console.error('Track error:', error.message));
}

module.exports = { track, EVENTS };
