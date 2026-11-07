import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const OUTCOMES = {
  connected: 'GitHub account connected. You can now verify your projects.',
  denied: 'GitHub connection was cancelled.',
  'in-use': 'That GitHub account is already linked to another CodeSphere account.',
  invalid: 'The GitHub link expired. Please try again.',
  failed: 'Could not connect to GitHub. Please try again.',
  disabled: 'GitHub connection is not set up on this server yet.',
};

// "Connect GitHub" card (My projects). Shows nothing if the server has no OAuth app.
export default function GithubConnect({ outcome }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/github/status').then(setStatus).catch(() => setStatus({ enabled: false }));
  }, []);

  if (!status?.enabled) return null;

  const connect = async () => {
    try {
      const { url } = await apiRequest('/github/connect', { method: 'POST' });
      window.location.assign(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect your GitHub account? Existing verified badges stay.')) return;
    await apiRequest('/github/connection', { method: 'DELETE' });
    setStatus((s) => ({ ...s, connected: false, login: '' }));
  };

  return (
    <section className="gc-card">
      <i className="bi bi-github" aria-hidden="true" />
      <div>
        {status.connected
          ? <><strong>Connected as @{status.login}</strong><span>Open a project and press &quot;Verify with GitHub&quot; to earn a verified badge.</span></>
          : <><strong>Connect your GitHub account</strong><span>Prove you own or contributed to a repository. We only read your public profile and don&apos;t store any token.</span></>}
        {outcome && OUTCOMES[outcome] && <em className={outcome === 'connected' ? 'ok' : ''}>{OUTCOMES[outcome]}</em>}
        {error && <em>{error}</em>}
      </div>
      {status.connected
        ? <button type="button" className="ph-btn" onClick={disconnect}>Disconnect</button>
        : <button type="button" className="btn btn-gold" onClick={connect}>Connect GitHub</button>}
    </section>
  );
}
