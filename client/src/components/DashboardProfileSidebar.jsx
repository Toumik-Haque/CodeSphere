import BadgeStrip from './BadgeStrip';

export default function DashboardProfileSidebar({
  user,
  completion,
  photoInputRef,
  onPhotoChange,
  // The single CodeSphere banner (client/public) used for every member.
  defaultBanner = '/default-profile-banner.webp',
  showBadges = false,
}) {
  const name = user?.name || 'CodeSphere Member';
  const username = user?.username;
  const profileImage = user?.profileImage?.url;
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <aside className="student-profile-sidebar">
      <section className="student-identity-card has-cover">
        <div
          className="student-cover"
          style={{ backgroundImage: `url("${encodeURI(defaultBanner)}")` }}
        />
        <div className="student-avatar">
          {profileImage ? (
            <img src={profileImage} alt={name} />
          ) : (
            name.charAt(0).toUpperCase()
          )}

          {photoInputRef && onPhotoChange && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={onPhotoChange}
              />
              <button
                type="button"
                className="profile-image-upload-button profile-photo-upload-button"
                onClick={() => photoInputRef.current?.click()}
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                <i className="bi bi-camera" />
              </button>
            </>
          )}
        </div>

        <div className="student-identity-content">
          <h2>{name}</h2>
          {user?.email && <p>{user.email}</p>}
          {username && <p>@{username}</p>}
          {showBadges && <BadgeStrip />}
        </div>

        {joinedDate && (
          <div className="student-identity-footer">
            <span><i className="bi bi-calendar3" /> Member since</span>
            <strong>{joinedDate}</strong>
          </div>
        )}
      </section>

      {completion !== undefined && (
        <section className="profile-sidebar-card">
          <h3>Profile completion</h3>

          <div className="profile-completion-top">
            <span>Complete your profile</span>
            <strong>{completion}%</strong>
          </div>

          <div
            className="profile-progress-track"
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Profile completion"
          >
            <div
              className="profile-progress-fill"
              style={{ width: `${completion}%` }}
            />
          </div>

          <p>A complete profile helps the community discover your work.</p>
        </section>
      )}
    </aside>
  );
}
