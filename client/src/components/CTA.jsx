import '../css/CTA.css';

const CTA = () => (
  <section className="contact-cta" id="contact">
  <div className="contact-cta-panel">
    <h2>
      Have an idea?
      <br />
      <span>Let's build it together.</span>
    </h2>

    <p>
      Questions, collaborations, or just want to say hello?
      We'd love to hear from you.
    </p>

    <a href="/contact" className="btn btn-gold contact-cta-button">
      Contact Us
      <i className="bi bi-arrow-up-right" aria-hidden="true" />
    </a>
  </div>
</section>
);

export default CTA;


