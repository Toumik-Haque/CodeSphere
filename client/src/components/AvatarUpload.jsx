import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

const hueOf = (name = '') => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

// The signed-in user's avatar. Click it to upload or change the photo
// (works for every account, admins included). Shows a camera badge until
// a photo is set.
export default function AvatarUpload({ className = '' }) {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user) return null;

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The photo must be 5 MB or smaller.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('profileImage', file, file.name);
      const { profileImage } = await apiRequest('/users/profile/image', { method: 'POST', body: form });
      updateUser({ profileImage });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const avatarUrl = user.profileImage?.url || '';
  const label = avatarUrl ? 'Change your profile photo' : 'Add a profile photo';
  return (
    <span className="avatar-upload">
      <button
        type="button"
        className={`${className} avatar-upload-btn ${avatarUrl ? 'has-photo' : ''}`}
        style={avatarUrl ? undefined : { '--hue': hueOf(user.name) }}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={error || label}
        aria-label={label}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initialsOf(user.name)}
        <span className={`avatar-upload-badge ${avatarUrl ? 'on-hover' : ''}`} aria-hidden="true">
          <i className={`bi ${busy ? 'bi-hourglass-split' : 'bi-camera-fill'}`} />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
      {error && <span className="avatar-upload-error" role="alert">{error}</span>}
    </span>
  );
}
