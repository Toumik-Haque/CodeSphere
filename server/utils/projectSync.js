// Background refresh of GitHub snapshots for published projects.
// Each run refreshes up to SYNC_BATCH projects not synced in the last day,
// one at a time (gentle on GitHub's rate limit). Student-written fields are
// never touched. A repository that disappears is flagged, not deleted.
// PROJECT_SYNC=off disables it.

const { Project } = require('../models/Project');
const { refreshRepo } = require('./githubImport');
const { notify } = require('./notify');

const SYNC_BATCH = 15;
const STALE_MS = 24 * 60 * 60 * 1000;

async function syncStaleProjects() {
  const stale = await Project.find({
    status: 'published',
    'github.url': { $exists: true, $ne: '' },
    $or: [{ lastSyncedAt: { $lt: new Date(Date.now() - STALE_MS) } }, { lastSyncedAt: null }],
  }).sort({ lastSyncedAt: 1 }).limit(SYNC_BATCH);

  let refreshed = 0;
  let missing = 0;
  for (const project of stale) {
    try {
      const repo = await refreshRepo(project.github.url);
      if (repo) {
        project.github = { ...repo, pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : undefined, fetchedAt: new Date(repo.fetchedAt) };
        project.githubUnavailable = false;
        refreshed += 1;
      } else if (!project.githubUnavailable) {
        project.githubUnavailable = true;
        missing += 1;
        await notify(project.owner, {
          type: 'project',
          title: `We can't reach the GitHub repository for "${project.title}"`,
          body: 'It may have been deleted, renamed or made private. Update the link from your project editor.',
          link: `/projects/${project._id}/edit`,
        });
      }
      project.lastSyncedAt = new Date();
      await project.save();
    } catch (error) {
      // Rate-limited or GitHub down: stop this run, try again next time.
      if (error.status === 429 || error.status === 503) break;
      console.error('Project sync error:', error.message);
    }
  }
  return { checked: stale.length, refreshed, missing };
}

function startProjectSync() {
  if (process.env.PROJECT_SYNC === 'off') return;
  const run = () => syncStaleProjects()
    .then((r) => r.checked && console.log(`Project sync: ${r.refreshed} refreshed, ${r.missing} missing`))
    .catch((e) => console.error('Project sync failed:', e.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 6 * 60 * 60 * 1000).unref();
}

module.exports = { syncStaleProjects, startProjectSync };
