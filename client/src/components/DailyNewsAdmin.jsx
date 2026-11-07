import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { timeAgo } from '../lib/time';

const LABELS = { hackernews: 'Hacker News', devto: 'DEV', rss: 'RSS feeds', gnews: 'GNews', newsdata: 'NewsData.io' };

// Status of the automatic daily feed (Admin → Tech News → Daily news).
export default function DailyNewsAdmin() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/news/admin/daily').then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const sync = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { results } = await apiRequest('/news/admin/daily/sync', { method: 'POST' });
      setMessage(results.map((r) => `${LABELS[r.source] || r.source}: ${r.ok ? `+${r.added}` : `failed (${r.error})`}`).join(' · '));
      setVersion((v) => v + 1);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="news-muted">{message || 'Loading…'}</p>;

  return (
    <div className="dn-admin">
      <p className="news-muted">
        Stories are collected automatically every few hours and published straight to the <strong>Today</strong> feed. No review needed.
        Every morning a top-5 &quot;Today in Tech&quot; goes out as a notification (and email to daily subscribers).
      </p>
      <div className="dn-admin-stats">
        <div><strong>{data.total}</strong><span>stories stored</span></div>
        <div><strong>{data.state?.lastRunAt ? timeAgo(data.state.lastRunAt) : 'never'}</strong><span>last sync</span></div>
        <div><strong>{data.today?.notifiedAt ? 'Sent' : 'Not yet'}</strong><span>today&apos;s notification{data.today?.emailCount ? ` · ${data.today.emailCount} emails` : ''}</span></div>
        <div><strong>{data.autoDigest ? 'On' : 'Off'}</strong><span>auto weekly Brief</span></div>
      </div>
      <table className="dn-admin-table">
        <thead><tr><th>Source</th><th>Last result</th></tr></thead>
        <tbody>
          {(data.state?.results || []).map((r) => (
            <tr key={r.source}>
              <td>{LABELS[r.source] || r.source}</td>
              <td className={r.ok ? 'ok' : 'bad'}>{r.ok ? `OK · +${r.added} new` : `Failed: ${r.error}`}</td>
            </tr>
          ))}
          {!data.keys.gnews && <tr><td>GNews</td><td className="news-muted">Off: add GNEWS_API_KEY (free) to enable</td></tr>}
          {!data.keys.newsdata && <tr><td>NewsData.io</td><td className="news-muted">Off: add NEWSDATA_API_KEY (free) to enable</td></tr>}
        </tbody>
      </table>
      <button type="button" className="btn btn-gold" onClick={sync} disabled={busy}>
        <i className="bi bi-arrow-repeat" aria-hidden="true" /> {busy ? 'Syncing…' : 'Sync now'}
      </button>
      {message && <p className="news-muted" role="status">{message}</p>}
    </div>
  );
}
