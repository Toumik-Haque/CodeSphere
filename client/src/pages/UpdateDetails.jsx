import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import '../css/Updates.css';

export default function UpdateDetails() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: '', announcement: null, error: '' });

  useEffect(() => {
    let active = true;
    apiRequest(`/announcements/${encodeURIComponent(id)}`)
      .then((result) => {
        if (active) setResult({ id, announcement: result.announcement, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            id,
            announcement: null,
            error: requestError.message || 'Could not load this update.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isCurrentResult = result.id === id;
  const announcement = isCurrentResult ? result.announcement : null;
  const error = isCurrentResult ? result.error : '';
  const loading = !isCurrentResult;
  const date = announcement?.publishedAt
    ? new Date(announcement.publishedAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : '';

  return (
    <>
      <Navbar />
      <main className="update-detail-page">
        <div className="update-detail-container">
          <Link className="update-detail-back" to="/">
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to CodeSphere
          </Link>

          {loading ? (
            <section className="update-detail-state" role="status">
              <span className="update-detail-spinner" />
              <p>Loading community update…</p>
            </section>
          ) : error ? (
            <section className="update-detail-state is-error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <h1>Update unavailable</h1>
              <p>{error}</p>
            </section>
          ) : announcement ? (
            <article className="update-detail-card">
              <header className="update-detail-header">
                <span className="update-detail-kicker">
                  <i className="bi bi-megaphone" aria-hidden="true" /> Community update
                </span>
                <h1>{announcement.title}</h1>
                <p><i className="bi bi-clock" aria-hidden="true" /> Published {date}</p>
              </header>

              <div
                className="update-detail-body"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.body || '') }}
              />

              {announcement.attachments?.length > 0 && (
                <section className="update-detail-media" aria-label="Update attachments">
                  <h2><i className="bi bi-paperclip" aria-hidden="true" /> Attachments</h2>
                  <div className="update-detail-media-grid">
                    {announcement.attachments.map((file) => (
                      <a
                        key={file.fileId || file.url}
                        className={`update-detail-media-item ${file.type === 'document' ? 'is-document' : ''}`}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {file.type === 'image' ? (
                          <img src={file.url} alt={file.name} loading="lazy" />
                        ) : (
                          <span className="update-detail-pdf-icon">
                            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                          </span>
                        )}
                        <span><i className="bi bi-box-arrow-up-right" aria-hidden="true" /> {file.name}</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </article>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
