import { Link } from 'react-router-dom';
import { STATUS, categoryOf } from '../lib/projects';
import '../css/Projects.css';

// Project card used in the Showcase, My Projects and guided pages.
export default function ProjectCard({ p, showStatus = false }) {
  const cat = categoryOf(p.category);
  const st = STATUS[p.status];
  return (
    <article className="ph-card">
      <div className="ph-card-cover" style={p.cover ? { backgroundImage: `url("${encodeURI(p.cover)}")` } : undefined}>
        {!p.cover && <i className={`bi ${cat.icon}`} aria-hidden="true" />}
        {p.featured && <span className="ph-featured"><i className="bi bi-star-fill" aria-hidden="true" /> Featured</span>}
        {showStatus && st && <span className={`ph-status tone-${st.tone}`}><i className={`bi ${st.icon}`} aria-hidden="true" /> {st.label}</span>}
      </div>
      <div className="ph-card-body">
        <div className="ph-chips">
          <span className="ph-chip"><i className={`bi ${cat.icon}`} aria-hidden="true" /> {cat.label}</span>
          <span className={`ph-chip level-${p.level?.toLowerCase()}`}>{p.level}</span>
          {p.teamType === 'team' && <span className="ph-chip">Team</span>}
          {p.sourceType === 'guided' && <span className="ph-chip">Guided</span>}
        </div>
        <h3><Link to={`/projects/${p.slug}`} className="ph-stretch">{p.title}</Link></h3>
        {p.summary && <p className="ph-summary">{p.summary}</p>}
        {p.techStack?.length > 0 && <p className="ph-stack">{p.techStack.slice(0, 5).join(' · ')}</p>}
        <footer className="ph-card-foot">
          {p.owner && (
            <span className="ph-owner">
              {p.owner.avatarUrl ? <img src={p.owner.avatarUrl} alt="" /> : <span aria-hidden="true">{p.owner.initials}</span>}
              {p.owner.name}{p.contributorsCount > 1 && ` +${p.contributorsCount - 1}`}
            </span>
          )}
          <span className="ph-links">
            {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label="GitHub repository"><i className="bi bi-github" /></a>}
            {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label="Live demo"><i className="bi bi-box-arrow-up-right" /></a>}
          </span>
        </footer>
      </div>
    </article>
  );
}
