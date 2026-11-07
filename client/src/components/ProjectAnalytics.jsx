import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const FUNNEL = [
  ['project_hub_viewed', 'Hub views'],
  ['github_import_started', 'Imports started'],
  ['github_import_succeeded', 'Imports succeeded'],
  ['project_draft_created', 'Drafts created'],
  ['project_submitted', 'Submitted'],
  ['project_published', 'Published'],
];
const ENGAGEMENT = [
  ['guided_project_started', 'Guided started'],
  ['milestone_completed', 'Milestones done'],
  ['project_update_created', 'Build in Public posts'],
  ['project_demo_clicked', 'Demo clicks'],
  ['github_source_clicked', 'Source clicks'],
];
const STATUS_LABELS = { 400: 'Invalid link', 404: 'Not found / private', 429: 'Rate limited', 422: 'GitHub error', 503: 'GitHub down', 500: 'Server error' };

const show = (v, suffix = '%') => (v === null || v === undefined ? '—' : `${v}${suffix}`);

// Project Hub funnel (admins + project reviewers).
export default function ProjectAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/projects/admin/analytics?days=${days}`).then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (error) return <p className="ph-error">{error}</p>;
  if (!data) return <div className="ph-card ph-skeleton" />;
  const max = Math.max(1, ...FUNNEL.map(([k]) => data.counts[k] || 0));
  const m = data.metrics;

  return (
    <div className="pa-wrap">
      <div className="pa-head">
        <h2>Project Hub analytics</h2>
        <select value={days} onChange={(e) => { setData(null); setDays(Number(e.target.value)); }} aria-label="Period">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      <div className="pa-metrics">
        <div><strong>{show(m.importConversion)}</strong><span>Import success</span></div>
        <div><strong>{show(m.publishConversion)}</strong><span>Submitted → published</span></div>
        <div><strong>{show(m.medianHoursToPublish, ' h')}</strong><span>Median time to publish</span></div>
        <div><strong>{show(m.studentActivation)}</strong><span>Students who started a project</span></div>
        <div><strong>{show(m.guidedCompletion)}</strong><span>Guided completion</span></div>
        <div><strong>{show(m.showcaseQuality)}</strong><span>Complete showcase listings</span></div>
      </div>

      <section className="pd-block">
        <h3>Submission funnel</h3>
        <ul className="pa-funnel">
          {FUNNEL.map(([k, label]) => (
            <li key={k}>
              <span>{label}</span>
              <span className="pa-bar"><span style={{ width: `${((data.counts[k] || 0) / max) * 100}%` }} /></span>
              <strong>{data.counts[k] || 0}</strong>
            </li>
          ))}
        </ul>
      </section>

      <div className="pa-two">
        <section className="pd-block">
          <h3>Engagement</h3>
          <dl className="pe-facts">{ENGAGEMENT.map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{data.counts[k] || 0}</dd></div>)}</dl>
        </section>
        <section className="pd-block">
          <h3>Why imports failed</h3>
          {data.importFailures.length === 0 ? <p className="ph-muted">No failed imports in this period.</p> : (
            <ul className="pd-list">{data.importFailures.map((f) => <li key={f.status}>{STATUS_LABELS[f.status] || f.status}: {f.count}</li>)}</ul>
          )}
        </section>
      </div>
      <p className="ph-muted">Focus on complete, correctly credited projects, not raw numbers. {m.publishedProjects} published projects in total.</p>
    </div>
  );
}
