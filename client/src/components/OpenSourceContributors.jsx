import { useState } from 'react';
import { Link } from 'react-router-dom';

// Open-source contributors to the CodeSphere repository.
// Empty for now: this will be filled from real, reviewed GitHub pull
// requests later. Each entry: { name, github, mergedPRs, points }.
const CONTRIBUTORS = [];

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Rank by points, then merged PRs; equal points share a rank (1, 1, 3).
function rankContributors(list) {
  const sorted = [...list].sort((a, b) => b.points - a.points || b.mergedPRs - a.mergedPRs);
  return sorted.map((person, index) => {
    const firstWithSamePoints = sorted.findIndex((p) => p.points === person.points);
    return { ...person, rank: Math.min(index, firstWithSamePoints) + 1 };
  });
}

const RANKED = rankContributors(CONTRIBUTORS);

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function GithubAvatar({ person, size = 'md' }) {
  return (
    <span className={`lb-avatar lb-avatar-${size} lb-avatar-gh`} aria-hidden="true">
      {initials(person.name)}
      <img
        src={`https://github.com/${person.github}.png?size=96`}
        alt=""
        loading="lazy"
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
    </span>
  );
}

export default function OpenSourceContributors() {
  const [search, setSearch] = useState('');

  const ranked = RANKED;

  const query = search.trim().toLowerCase();
  const filtered = ranked.filter(
    (p) => p.name.toLowerCase().includes(query) || p.github.toLowerCase().includes(query),
  );
  const podium = ranked.slice(0, 3);
  const totalPRs = CONTRIBUTORS.reduce((sum, p) => sum + p.mergedPRs, 0);
  const totalPoints = CONTRIBUTORS.reduce((sum, p) => sum + p.points, 0);

  return (
    <section className="lb-os" aria-labelledby="lb-os-title">
      <div className="lb-os-intro">
        <h2 id="lb-os-title">
          <i className="bi bi-github" aria-hidden="true" /> Hall of Contributors
        </h2>
        <p>
          Students who improve the CodeSphere website itself through open-source
          pull requests on GitHub.
        </p>
      </div>

      <div className="lb-os-summary">
        <div><i className="bi bi-people" aria-hidden="true" /><strong>{CONTRIBUTORS.length}</strong><span>contributors</span></div>
        <div><i className="bi bi-git" aria-hidden="true" /><strong>{totalPRs}</strong><span>merged PRs</span></div>
        <div><i className="bi bi-stars" aria-hidden="true" /><strong>{totalPoints}</strong><span>points</span></div>
      </div>

      {ranked.length === 0 ? (
        <div className="lb-empty">
          <div className="lb-empty-emoji" aria-hidden="true">🌱</div>
          <h2>No contributions yet</h2>
          <p>
            Be the first name on this board. Pick a &quot;good first issue&quot;, open a
            pull request, and once it&apos;s reviewed and merged you&apos;ll appear here.
          </p>
          <Link to="/open-source#how-to-contribute" className="btn btn-gold">
            Learn how to contribute
          </Link>
        </div>
      ) : (
        <>
          <div className="lb-podium">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((person) => (
              <a
                key={person.github}
                className={`lb-podium-spot place-${person.rank}`}
                href={`https://github.com/${person.github}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="lb-medal" aria-hidden="true">{MEDALS[person.rank] || `#${person.rank}`}</span>
                <GithubAvatar person={person} size="lg" />
                <strong className="lb-podium-name">{person.name}</strong>
                <span className="lb-podium-year">@{person.github}</span>
                <div className="lb-podium-metric">
                  <strong>{person.points} pts</strong>
                  <span>{person.mergedPRs} merged PRs</span>
                </div>
                <div className="lb-podium-block"><span>#{person.rank}</span></div>
              </a>
            ))}
          </div>

          <label className="lb-os-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search contributors..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search contributors"
            />
          </label>

          <ol className="lb-list">
            {filtered.map((person) => (
              <li key={person.github}>
                <a className="lb-row" href={`https://github.com/${person.github}`} target="_blank" rel="noreferrer">
                  <span className="lb-rank">#{person.rank}</span>
                  <GithubAvatar person={person} />
                  <span className="lb-who">
                    <strong>{person.name}</strong>
                    <span>@{person.github}</span>
                  </span>
                  <span className="lb-detail">
                    <span title="Merged pull requests"><i className="bi bi-git" aria-hidden="true" /> {person.mergedPRs}</span>
                  </span>
                  <span className="lb-metric">
                    <strong>{person.points} pts</strong>
                    <span>{person.mergedPRs} merged PRs</span>
                  </span>
                </a>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="lb-empty">No contributors match “{search}”.</li>
            )}
          </ol>
        </>
      )}

      <div className="lb-os-note">
        <i className="bi bi-shield-check" aria-hidden="true" />
        <p>
          <strong>How points will work:</strong> contributions are evaluated from
          merged GitHub pull requests to the CodeSphere repository, considering the
          quality of the change, reviews, documentation and tests, not just the number
          of PRs. Scoring rules are coming soon.
        </p>
      </div>
    </section>
  );
}
