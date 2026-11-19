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

  if (!status) return null;
  if (!status.enabled && !status.connected) {
    return (
      <section className="gc-card">
        <i className="bi bi-github" aria-hidden="true" />
        <div>
          <strong>GitHub connection is not configured</strong>
          <span>Ask an admin to enable GitHub OAuth on the server before verifying project ownership.</span>
        </div>
      </section>
    );
  }

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
          ? <><strong>Connected as @{status.login}</strong><span>{status.enabled ? 'Open a project and press "Verify with GitHub" to earn a verified badge.' : 'Verification works locally with this saved connection; OAuth is only needed to connect a new account.'}</span></>
          : <><strong>Connect your GitHub account</strong><span>Prove you own or contributed to a repository. We only read your public profile and don&apos;t store any token.</span></>}
        {outcome && OUTCOMES[outcome] && <em className={outcome === 'connected' ? 'ok' : ''}>{OUTCOMES[outcome]}</em>}
        {error && <em>{error}</em>}
      </div>
      {status.connected
        ? <button type="button" className="ph-btn" onClick={disconnect}>Disconnect</button>
        : status.enabled ? <button type="button" className="btn btn-gold" onClick={connect}>Connect GitHub</button> : null}
    </section>
  );
}
