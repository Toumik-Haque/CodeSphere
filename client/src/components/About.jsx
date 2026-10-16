import React from 'react';
import '../css/About.css';

const features = [
  {
    number: '01',
    icon: 'bi-code-slash',
    title: 'Learn by Doing',
    description:
      'Turn concepts into practical skills through coding challenges, hands-on workshops, and experimentation.',
  },
  {
    number: '02',
    icon: 'bi-people',
    title: 'Grow Together',
    description:
      'Connect with fellow learners, exchange ideas, and learn from each other in a supportive community.',
  },
  {
    number: '03',
    icon: 'bi-lightbulb',
    title: 'Build Real Projects',
    description:
      'Transform your ideas into meaningful projects while developing problem-solving and teamwork skills.',
  },
];

const About = () => {
  return (
    <section className="about-section" id="about">
      <div className="container">
        <div className="about-grid">
          {/* Left content */}
          <div className="about-content">
            <span className="section-eyebrow">
              <span className="section-eyebrow-line" />
              ABOUT OUR COMMUNITY
            </span>

            <h2 className="about-title">
              More Than Coding.
              <br />
              <span className="gold-text">A Community.</span>
            </h2>

            <p className="about-description">
              CodeSphere is a official community of <span className='gold-text'>Alipurduar Govt Engineering & Management College</span> for curious minds who want to
              explore technology, sharpen their skills and turn ideas
              into reality.
            </p>

            <p className="about-description about-description-secondary">
              Whether
              you're taking your first steps in programming or
              developing your next big idea, there's a place for you
              here.
            </p>

            <a href="#events" className="about-link">
              Discover what we do
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>

            <div className="about-motto">
              <i className="bi bi-quote" aria-hidden="true" />
              <p>
                We believe the best way to grow is to learn together,
                build together and share what we discover.
              </p>
            </div>
          </div>

          {/* Right feature cards */}
          <div className="about-features">
            {features.map((feature) => (
              <article className="about-feature-card" key={feature.number}>
                <div className="about-feature-top">
                  <span className="about-feature-number">
                    {feature.number}
                  </span>

                  <span className="about-feature-icon">
                    <i className={`bi ${feature.icon}`} aria-hidden="true" />
                  </span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <span className="about-feature-bottom-line" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;