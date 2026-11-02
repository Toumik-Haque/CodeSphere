
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import '../css/Contact.css'

// Replace these with your actual CodeSphere contact details.
const CONTACT_EMAIL = 'codesphere@agemc.ac.in';
const CONTACT_LOCATION = 'Alipurduar Government Engineering and Management College, West Bengal, 736202';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({
    type: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (submitting) return;

    setSubmitting(true);

    try {
      const data = await apiRequest('/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setStatus({
        type: 'success',
        message: data.message || 'Your message has been sent successfully!',
      });

      setForm({ ...initialForm });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    CONTACT_LOCATION
  )}`;

  return (
    <>
      <Navbar />

      <main className="contact-page">
        <div className="container">
          <header className="contact-heading">
            <span className="section-eyebrow">
              <span className="section-eyebrow-line" />
              THE CODESPHERE COMMUNITY
            </span>

            <h1 className="contact-title">
              Let's Start a <span className="gold-text">Conversation.</span>
            </h1>

            <p className="contact-subtitle">
              Have a question, an idea, or an opportunity to collaborate?
              We'd love to hear from you. Send us a message and our team
              will get back to you.
            </p>
          </header>

          <div className="contact-layout">
            <aside className="contact-info contact-info-card">
              <span className="contact-card-eyebrow">WE'RE HERE TO HELP</span>

              <h2>Let's Connect.</h2>

              <p className="contact-info-description">
                Reach out to the CodeSphere team. We're always open to
                questions, suggestions, and new opportunities.
              </p>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon" aria-hidden="true">
                    <i className="bi bi-envelope" />
                  </div>
                  <div>
                    <strong>Email Us</strong>
                    <a
                      className="contact-info-link"
                      href={`mailto:${CONTACT_EMAIL}`}
                    >
                      {CONTACT_EMAIL}
                      <i
                        className="ms-2 bi bi-box-arrow-up-right"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon" aria-hidden="true">
                    <i className="bi bi-geo-alt" />
                  </div>
                  <div>
                    <strong>Our Location</strong>
                    <a
                      className="contact-info-link"
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {CONTACT_LOCATION}
                      <i
                        className="ms-2 bi bi-box-arrow-up-right"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon" aria-hidden="true">
                    <i className="bi bi-chat-dots" />
                  </div>
                  <div>
                    <strong>Collaborate With Us</strong>
                    <span>
                      Have an idea or partnership proposal? Let's talk.
                    </span>
                  </div>
                </div>
              </div>

              <div className="contact-info-footer">
                <i className="bi bi-send" aria-hidden="true" />
                <span>We look forward to hearing from you.</span>
              </div>
            </aside>

            <section className="contact-form-card">
              <div className="contact-form-heading">
                <span className="contact-form-label">GET IN TOUCH</span>
                <h2>Send Us a Message</h2>
                <p>
                  Fill in the details below and we'll receive your message.
                </p>
              </div>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-form-row">
                  <div className="contact-field">
                    <label htmlFor="contact-name">Your Name</label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      placeholder="Enter your name"
                      value={form.name}
                      onChange={handleChange}
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-email">Email Address</label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      maxLength={254}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="contact-field">
                  <label htmlFor="contact-subject">Subject</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    placeholder="What is this regarding?"
                    value={form.subject}
                    onChange={handleChange}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="contact-message">Your Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="Write your message here..."
                    value={form.message}
                    onChange={handleChange}
                    maxLength={5000}
                    required
                  />
                </div>

                <div className="contact-honeypot" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={handleChange}
                  />
                </div>

                {status.message && (
                  <div
                    className={`contact-status ${status.type}`}
                    role="status"
                    aria-live="polite"
                  >
                    {status.message}
                  </div>
                )}

                <button
                  className="contact-submit text-white"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                  {!submitting && (
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  )}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      <Footer />      
    </>
  );
}
