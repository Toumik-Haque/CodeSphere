import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import MemberProfile from '../pages/MemberProfile';
import '../css/DashboardDiscover.css';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function DashboardDiscover({ user, profileUsername }) {
  const navigate = useNavigate();
  const { user: authenticatedUser } = useAuth();
  const currentUser = user || authenticatedUser;
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const ownProfilePath = currentUser?.username
    ? `/user/${encodeURIComponent(currentUser.username)}`
    : '/user/profile';
  const isViewingMember = Boolean(
    profileUsername &&
    profileUsername.toLowerCase() !== currentUser?.username?.toLowerCase()
  );

  useEffect(() => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) return undefined;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearching(true);
      setSearchError('');

      apiRequest(`/users/search?q=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal,
      })
        .then((response) => {
          setMembers(response.users || []);
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setSearchError(error.message || 'Unable to search members.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const handleSearchChange = (event) => {
    setQuery(event.target.value);
    setMembers([]);
    setSearching(false);
    setSearchError('');
    if (isViewingMember) navigate(ownProfilePath, { replace: true });
  };

  const clearSearch = () => {
    setQuery('');
    setMembers([]);
    setSearching(false);
    setSearchError('');
  };
  const showResults = query.trim().length >= 2 && !isViewingMember;

  const returnToOwnProfile = () => {
    setQuery('');
    setMembers([]);
    setSearching(false);
    setSearchError('');
    navigate(ownProfilePath);
  };

  return (
    <section className="dashboard-discover">
      <div className="dashboard-discover-toolbar">
        <button
          className="dashboard-discover-own-avatar"
          type="button"
          onClick={returnToOwnProfile}
          aria-label="Return to your public profile"
          title="Your public profile"
        >
          {(currentUser?.profileImage?.url || currentUser?.avatarUrl) ? (
            <img src={currentUser.profileImage?.url || currentUser.avatarUrl} alt="" />
          ) : (
            getInitials(currentUser?.name || 'User')
          )}
          <span className="dashboard-discover-own-avatar-indicator" />
        </button>
        <div className="dashboard-discover-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            id="dashboard-member-search"
            type="search"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search people by name, username, or college"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>

        {showResults && (
          <div className="dashboard-discover-results" aria-live="polite" role="status">
            {searching ? (
              <p className="dashboard-discover-result-state">
                <span className="dashboard-discover-spinner" />
                Searching members...
              </p>
            ) : searchError ? (
              <p className="dashboard-discover-result-state is-error">{searchError}</p>
            ) : members.length > 0 ? (
              <>
                <div className="dashboard-discover-results-heading">
                  <strong>Matching members</strong>
                  <span>{members.length} shown</span>
                </div>
                {members.map((member) => (
                  <button
                    className="dashboard-discover-member"
                    key={member._id}
                    type="button"
                    onClick={() =>
                      navigate(`/user/${encodeURIComponent(member.username)}`)
                    }
                  >
                    <span className="dashboard-discover-avatar">
                      {(member.profileImage?.url || member.avatarUrl) ? (
                        <img src={member.profileImage?.url || member.avatarUrl} alt="" />
                      ) : (
                        getInitials(member.name)
                      )}
                    </span>
                    <span className="dashboard-discover-member-info">
                      <strong>{member.name}</strong>
                      <span>
                        @{member.username}
                        {member.collegeName ? ` · ${member.collegeName}` : ''}
                      </span>
                    </span>
                    <i className="bi bi-arrow-up-right" aria-hidden="true" />
                  </button>
                ))}
              </>
            ) : (
              <p className="dashboard-discover-result-state">
                No members found. Try another name, username, or college.
              </p>
            )}
          </div>
        )}

        {query.trim().length === 1 && !isViewingMember && (
          <p className="dashboard-discover-short-query">
            Enter one more character to search.
          </p>
        )}
      </div>

      {isViewingMember ? (
        <MemberProfile
          key={profileUsername}
          profileUsername={profileUsername}
          embedded
        />
      ) : currentUser?.username ? (
        <MemberProfile
          key={currentUser.username}
          profileUsername={currentUser.username}
          embedded
        />
      ) : (
        <div className="dashboard-discover-profile-unavailable">
          <i className="bi bi-person-badge" aria-hidden="true" />
          <h3>Your public profile is not ready</h3>
          <p>Add a username to your profile to preview how other members see you.</p>
        </div>
      )}
    </section>
  );
}
