const escapeHtml = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeUrl = (url = '') => (/^https?:\/\//i.test(url) ? escapeHtml(url) : '#');

const siteUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const apiUrl = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`).replace(/\/+$/, '');

const button = (label, url) => {
  if (!label || !url) return '';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 10px">
      <tr>
        <td align="center">
          <a href="${safeUrl(url)}" style="display:inline-block;padding:13px 26px;border-radius:11px;background:#df542f;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(223,84,47,0.22)">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
};

const secondaryLink = (label, url) => {
  if (!label || !url) return '';
  return `<p style="margin:0;color:#7b8794;font-size:12px;line-height:1.7;text-align:center">
    <a href="${safeUrl(url)}" style="color:#52677a;text-decoration:underline">${escapeHtml(label)}</a>
  </p>`;
};

function renderEmail({
  preheader = '',
  eyebrow = '',
  title = '',
  intro = '',
  body = '',
  ctaLabel = '',
  ctaUrl = '',
  secondaryLabel = '',
  secondaryUrl = '',
  footerNote = '',
  unsubscribeUrl = '',
  preferencesUrl = '',
  internal = false,
}) {
  const footerLinks = [];
  if (preferencesUrl) footerLinks.push(`<a href="${safeUrl(preferencesUrl)}" style="color:#7b8794;text-decoration:underline">Manage email preferences</a>`);
  if (unsubscribeUrl) footerLinks.push(`<a href="${safeUrl(unsubscribeUrl)}" style="color:#7b8794;text-decoration:underline">Unsubscribe</a>`);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#153653">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f7fb;padding:34px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5edf4;border-radius:18px;overflow:hidden">
          <tr>
            <td align="center" style="padding:28px 24px;background:#153653">
              <div style="color:#ffffff;font-size:27px;font-weight:800;letter-spacing:-1px">Code<span style="color:#ff8568">Sphere</span></div>
              <div style="margin-top:8px;color:#d5e6f2;font-size:10px;font-weight:600;letter-spacing:3px">LEARN · BUILD · CONNECT</div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 30px 24px">
              ${eyebrow ? `<div style="display:inline-block;padding:7px 13px;border-radius:30px;background:#fff0eb;color:#d94324;font-size:10px;font-weight:800;letter-spacing:1.4px">${escapeHtml(eyebrow)}</div>` : ''}
              <h1 style="margin:18px 0 12px;color:#153653;font-size:25px;line-height:1.3;letter-spacing:-0.6px">${escapeHtml(title)}</h1>
              ${intro ? `<p style="margin:0 0 18px;color:#52677a;font-size:15px;line-height:1.8">${escapeHtml(intro)}</p>` : ''}
              <div style="color:#34465a;font-size:14px;line-height:1.7">${body}</div>
              ${button(ctaLabel, ctaUrl)}
              ${secondaryLink(secondaryLabel, secondaryUrl)}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 28px;background:#f8fafc;border-top:1px solid #eaf0f5">
              <div style="color:#153653;font-size:13px;font-weight:800">Code<span style="color:#df542f">Sphere</span></div>
              <p style="margin:7px 0 0;color:#8996a5;font-size:11px;line-height:1.7">
                Learn. Build. Connect.<br>
                ${footerNote ? `${escapeHtml(footerNote)}<br>` : ''}
                ${internal ? 'This message was sent through the CodeSphere website.' : 'You received this email because you have a CodeSphere account.'}
              </p>
              ${footerLinks.length ? `<p style="margin:12px 0 0;color:#7b8794;font-size:11px;line-height:1.7">${footerLinks.join(' &nbsp;·&nbsp; ')}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderOtpEmail({ title, subtitle, otp, description, securityMessage, expiryMinutes }) {
  const body = `
    <p style="margin:0;color:#52677a;font-size:15px;line-height:1.8">${escapeHtml(description)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0">
      <tr>
        <td align="center" style="padding:24px 15px;background:#fff5f1;border:1px solid #f9d7cc;border-radius:14px">
          <div style="margin-bottom:12px;color:#a94a35;font-size:10px;font-weight:800;letter-spacing:2px">YOUR ONE-TIME PASSWORD</div>
          <div style="color:#153653;font-size:34px;font-weight:800;letter-spacing:9px;line-height:1.4">${escapeHtml(otp)}</div>
          <div style="margin-top:12px;color:#7b8794;font-size:11px">Enter this code in CodeSphere</div>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#52677a;font-size:13px;line-height:1.7">
      This code expires in <strong style="color:#d94324">${escapeHtml(expiryMinutes)} minutes</strong>. Please use it before it expires.
    </p>
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid #eaf0f5;color:#7b8794;font-size:12px;line-height:1.8">
      ${escapeHtml(securityMessage)}
    </div>`;

  return renderEmail({
    preheader: `Your CodeSphere one-time password is ${otp}`,
    eyebrow: subtitle,
    title,
    body,
    footerNote: 'This is an automated email. Please do not reply.',
  });
}

function unsubscribeUrl(userId, list, token) {
  const params = new URLSearchParams({ u: String(userId), t: token });
  if (list) params.set('list', list);
  return `${apiUrl()}/newsletter/unsubscribe?${params.toString()}`;
}

function preferencesUrl() {
  return `${siteUrl()}/profile`;
}

module.exports = {
  escapeHtml,
  safeUrl,
  siteUrl,
  apiUrl,
  renderEmail,
  renderOtpEmail,
  unsubscribeUrl,
  preferencesUrl,
};
