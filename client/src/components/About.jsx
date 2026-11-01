import React from 'react';
import '../css/About.css';

const features = [
  {
    number: '01',
    icon: 'bi-code-slash',
    title: 'Learn by Doing',
    description: 'Build practical skills through hands-on coding.',
  },
  {
    number: '02',
    icon: 'bi-people',
    title: 'Grow Together',
    description: 'Share ideas and learn with our community.',
  },
  {
    number: '03',
    icon: 'bi-lightbulb',
    title: 'Build Real Projects',
    description: 'Turn creative ideas into working projects.',
  },
];

const About = () => (
  <section className="about-section" id="about">
    <div className="container about-grid">
      <div className="about-content">
        <span className="about-eyebrow">
          <span className="about-eyebrow-line" />
          ABOUT CODESPHERE
        </span>

        <h2 className="about-title">
          More Than Coding.
          <br />
          <span className="about-accent">A Community.</span>
        </h2>

        <p className="about-description">
          A coding community at Alipurduar Govt Engineering &amp;
          Management College, where curious minds learn, collaborate,
          and create.
        </p>

        <a href="#events" className="about-link">
          Discover what we do
          <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </a>

        <div className="about-motto">
          <i className="bi bi-quote" aria-hidden="true" />
          <p>Learn together. Build together. Grow together.</p>
        </div>
      </div>

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
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default About;
