import React from 'react';
import '../css/JoinUs.css';

const communityLink =
  'https://chat.whatsapp.com/FDGLH2yMpFuDJJBx448afz';

const Community = () => {
  return (
    <section className="join-section" id="join">
      <div className="container">
        <div className="join-card">
          <div className="join-content">
            <span className="join-eyebrow">
              JOIN COMMUNITY. START YOUR JOURNEY.
            </span>

            <h2 className="join-title">
              Build Your Future with{' '}
              <span className="gold-text">CodeSphere.</span>
            </h2>

            <p className="join-description">
              Learn, collaborate, and grow with a community of tech enthusiasts.
            </p>

            <a
              className="join-primary-button"
              href="https://chat.whatsapp.com/FDGLH2yMpFuDJJBx448afz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-whatsapp" aria-hidden="true" />
              Join Our Community
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </a>
          </div>

          <div className="join-decoration" aria-hidden="true">
            <i className="bi bi-code-slash" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Community;
