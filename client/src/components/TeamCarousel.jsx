
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/CoreMembers.css';

const teamMembers = [
  {
    _id: 'member-1',
    name: 'Arnab Kr Dey',
    role: 'Core Team Member',
    image: 'https://i.pravatar.cc/500?img=12',
  },
  {
    _id: 'member-2',
    name: 'Sayan Singha',
    role: 'Core Team Member',
    image: 'https://i.pravatar.cc/500?img=11',
  },
  {
    _id: 'member-3',
    name: 'Toumik Haq',
    role: 'Core Team Member',
    image: 'https://i.pravatar.cc/500?img=13',
  },
  {
    _id: 'member-4',
    name: 'Saikat Tunga',
    role: 'Core Team Member',
    image: 'https://i.pravatar.cc/500?img=14',
  },
  {
    _id: 'member-5',
    name: 'Sovan Rajbanshi',
    role: 'Core Team Member',
    image: 'https://i.pravatar.cc/500?img=15',
  },
];

const SCROLL_SPEED = 50;

export default function TeamCarousel() {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) return undefined;

    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    let animationFrame;
    let previousTime = 0;

    const animate = (time) => {
      const currentTrack = trackRef.current;

      if (!currentTrack) return;

      if (!previousTime) previousTime = time;

      const deltaTime = Math.min(time - previousTime, 40);
      previousTime = time;

      const firstCard = currentTrack.children[0];
      const duplicateFirstCard =
        currentTrack.children[teamMembers.length];

      if (firstCard && duplicateFirstCard) {
        const loopPoint =
          duplicateFirstCard.offsetLeft - firstCard.offsetLeft;

        if (
          !paused &&
          !mediaQuery.matches &&
          loopPoint > 0 &&
          currentTrack.scrollWidth > currentTrack.clientWidth
        ) {
          currentTrack.scrollLeft +=
            (SCROLL_SPEED * deltaTime) / 1000;

          if (currentTrack.scrollLeft >= loopPoint) {
            currentTrack.scrollLeft -= loopPoint;
          }
        }
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMotionChange = () => {
      previousTime = 0;
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);

      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener(
          'change',
          handleMotionChange
        );
      } else {
        mediaQuery.removeListener(handleMotionChange);
      }
    };
  }, [paused]);

  const displayMembers = [...teamMembers, ...teamMembers];

  return (
    <section
      className="core-team-section"
      aria-labelledby="core-team-title"
    >
      <div className="core-team-heading">
        <div className="core-team-heading-content">
          <p className="core-team-eyebrow">
            THE PEOPLE BEHIND CODESPHERE
          </p>

          <h2 id="core-team-title">
            Meet Our <span>Core Team</span>
          </h2>

          <p className="core-team-description">
            The people bringing ideas to life and building our community.
          </p>
        </div>
      </div>

      <div
        className="core-team-viewport"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setPaused(false);
          }
        }}
      >
        <div
          className="core-team-track"
          ref={trackRef}
          role="region"
          aria-label="Core team members"
          aria-roledescription="carousel"
          tabIndex={0}
        >
          {displayMembers.map((member, index) => {
            const isDuplicate = index >= teamMembers.length;

            return (
              <article
                className="core-member-slide"
                key={`${member._id}-${index}`}
                aria-hidden={isDuplicate ? true : undefined}
                inert={isDuplicate ? true : undefined}
              >
                <Link
                  to="/team"
                  className="core-member-card-link"
                  aria-label={`Meet ${member.name} and the entire team`}
                  tabIndex={isDuplicate ? -1 : undefined}
                >
                  <div className="core-member-photo-wrap">
                    <img
                      className="core-member-photo"
                      src={member.image}
                      alt={
                        isDuplicate ? '' : `Portrait of ${member.name}`
                      }
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />

                    <div className="team-card-overlay">
                      <div className="team-card-socials">
                        <span
                          className="team-card-social-icon"
                          aria-hidden="true"
                        >
                          <i className="bi bi-linkedin" />
                        </span>

                        <span
                          className="team-card-social-icon"
                          aria-hidden="true"
                        >
                          <i className="bi bi-instagram" />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="core-member-info">
                    <h3>{member.name}</h3>
                    <p className="core-member-role">
                      {member.role}
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      <div className="core-team-footer">
        <Link to="/team" className="core-team-view-all">
          <span>Meet the entire team</span>
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
