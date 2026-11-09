import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import '../css/CodingStats.css';

// "At a glance" stats from the member's coding profiles, for the Overview.
const ICONS = {
  GitHub: 'bi-github',
  LeetCode: 'bi-code-square',
  Codeforces: 'bi-bar-chart-line',
  CodeChef: 'bi-cup-hot',
  AtCoder: 'bi-trophy',
  GeeksforGeeks: 'bi-journal-code',
  HackerRank: 'bi-award',
};

const format = (value) => (typeof value === 'number' ? value.toLocaleString('en-IN') : value);

// With a username it shows that member's public stats; without, your own.
export default function CodingStats({ username }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(username ? `/users/profile/${encodeURIComponent(username)}/coding-stats` : '/users/me/coding-stats', { signal: controller.signal })
      .then(setData)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Unable to load coding stats.');
      });
    return () => controller.abort();
  }, [username]);

  if (error) return null;

  const stats = data?.stats || [];
  if (username && data && stats.length === 0) return null;

  return (
    <section className="profile-section-card coding-stats-card">
      <div className="coding-stats-head">
        <div>
          <h2>Coding at a glance</h2>
          <p>Live from {username ? 'their' : 'your'} linked coding profiles.</p>
        </div>
      </div>

      {!data ? (
        <p className="coding-stats-empty">Loading coding stats…</p>
      ) : stats.length === 0 ? (
        <p className="coding-stats-empty">
          Add your GitHub, LeetCode, Codeforces, CodeChef, AtCoder, GeeksforGeeks or HackerRank
          profile to see your stats here.
        </p>
      ) : (
        <>
          <div className="coding-stats-totals">
            <div><strong>{format(data.totals.solved)}</strong><span>Problems solved</span></div>
            <div><strong>{format(data.totals.contributions)}</strong><span>GitHub contributions (last year)</span></div>
            <div><strong>{data.totals.platforms}</strong><span>Platforms linked</span></div>
          </div>

          <div className="coding-stats-grid">
            {stats.map((item) => (
              <article key={item.platform} className={`coding-stat ${item.ok ? '' : 'is-unavailable'}`}>
                <header>
                  <i className={`bi ${ICONS[item.platform] || 'bi-code-slash'}`} aria-hidden="true" />
                  <div>
                    <h3>{item.platform}</h3>
                    {item.handle && (
                      <a href={item.url} target="_blank" rel="noreferrer">@{item.handle}</a>
                    )}
                  </div>
                </header>
                {item.ok ? (
                  <dl>
                    {item.metrics.map((metric) => (
                      <div key={metric.label}>
                        <dt>{metric.label}</dt>
                        <dd>{format(metric.value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>{item.reason}</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
