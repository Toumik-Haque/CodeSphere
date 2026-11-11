const escapeHtml = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeUrl = (url = '') => (/^https?:\/\//i.test(url) ? escapeHtml(url) : '#');

const siteUrl = () => (process.env.CLIENT_URL || 'https://codesphereagemc.vercel.app').replace(/\/+$/, '');
const apiUrl = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`).replace(/\/+$/, '');
const logoUrl = () => `${siteUrl()}/email-logo.png`;

const button = (label, url) => {
  if (!label || !url) return '';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 8px">
      <tr>
        <td align="center">
          <a href="${safeUrl(url)}" target="_blank" style="display:inline-block;padding:15px 34px;border-radius:28px;background:#e8552f;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 8px 20px rgba(232,85,47,.28)">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
};

const secondaryLink = (label, url) => {
  if (!label || !url) return '';
  return `<p style="margin:0 0 6px;color:#7b8794;font-size:12px;line-height:1.7;text-align:center">
    <a href="${safeUrl(url)}" target="_blank" style="color:#52677a;text-decoration:underline">${escapeHtml(label)}</a>
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
  footerLinks.push(`<a href="${safeUrl(siteUrl())}" target="_blank" style="color:#9fc0dd;text-decoration:underline">Visit CodeSphere</a>`);
  if (preferencesUrl) footerLinks.push(`<a href="${safeUrl(preferencesUrl)}" target="_blank" style="color:#9fc0dd;text-decoration:underline">Manage email preferences</a>`);
  if (unsubscribeUrl) footerLinks.push(`<a href="${safeUrl(unsubscribeUrl)}" target="_blank" style="color:#9fc0dd;text-decoration:underline">Unsubscribe</a>`);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#edf2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#153653;word-break:break-word">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#edf2f8" style="background:#edf2f8;padding:36px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe8f1;border-radius:20px;overflow:hidden">
          <tr>
            <td height="5" bgcolor="#e8552f" style="height:5px;background:#e8552f;font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:40px 30px 34px;background:#12293f">
              <a href="${safeUrl(siteUrl())}" target="_blank" style="text-decoration:none">
                <img src="${escapeHtml(logoUrl())}" width="180" height="34" alt="CodeSphere" style="display:block;width:180px;height:34px;border:0;outline:none">
              </a>
              <p style="margin:16px 0 0;color:#9fc0dd;font-size:12px;font-weight:600;letter-spacing:1.6px">The Engineers&rsquo; Logic Club</p>
              <p style="margin:8px 0 0;color:#5d7794;font-size:9px;font-weight:700;letter-spacing:3px">LEARN &middot; BUILD &middot; CONNECT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:38px 38px 34px">
              ${eyebrow ? `<div style="display:inline-block;padding:7px 14px;border-radius:30px;background:#fff0ea;color:#d9431f;font-size:10px;font-weight:800;letter-spacing:1.4px">${escapeHtml(eyebrow)}</div>` : ''}
              <h1 style="margin:${eyebrow ? '20px' : '0'} 0 12px;color:#12293f;font-size:25px;line-height:1.3;letter-spacing:-0.6px;font-weight:800">${escapeHtml(title)}</h1>
              ${intro ? `<p style="margin:0 0 18px;color:#52677a;font-size:15px;line-height:1.8">${escapeHtml(intro)}</p>` : ''}
              <div style="color:#34465a;font-size:14px;line-height:1.75">${body}</div>
              ${button(ctaLabel, ctaUrl)}
              ${secondaryLink(secondaryLabel, secondaryUrl)}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:30px 28px 34px;background:#12293f;border-top:3px solid #e8552f">
              <div style="color:#ffffff;font-size:16px;font-weight:800;letter-spacing:-0.2px">Code<span style="color:#ff8a65">Sphere</span></div>
              <div style="margin-top:5px;color:#9fc0dd;font-size:11px;font-weight:600;letter-spacing:1.4px">The Engineers&rsquo; Logic Club</div>
              <p style="margin:16px 0 0;color:#7288a0;font-size:11px;line-height:1.8">
                ${footerNote ? `${escapeHtml(footerNote)}<br>` : ''}
                ${internal ? 'This message was sent through the CodeSphere website.' : 'You received this email because you have a CodeSphere account.'}
              </p>
              <p style="margin:14px 0 0;color:#7288a0;font-size:11px;line-height:1.8">${footerLinks.join(' &nbsp;&middot;&nbsp; ')}</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:#9aa8b8;font-size:10px;line-height:1.6;text-align:center">
          Alipurduar Government Engineering and Management College &middot; West Bengal, India
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderOtpEmail({ title, subtitle, otp, description, securityMessage, expiryMinutes }) {
  const body = `
    <p style="margin:0 0 4px;color:#52677a;font-size:15px;line-height:1.8">${escapeHtml(description)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0">
      <tr>
        <td align="center" style="padding:30px 20px;background:#fff8f4;border:1px dashed #f2c9ba;border-radius:16px">
          <div style="color:#c2492a;font-size:10px;font-weight:800;letter-spacing:2.6px">YOUR ONE-TIME PASSWORD</div>
          <div style="margin-top:16px;color:#12293f;font-size:36px;font-weight:800;letter-spacing:11px;font-family:'Courier New',Courier,monospace">${escapeHtml(otp)}</div>
          <div style="margin-top:16px;color:#8b98a7;font-size:11px;letter-spacing:0.4px">Enter this code in CodeSphere to continue</div>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#52677a;font-size:13px;line-height:1.7">
      This code expires in <strong style="color:#d9431f">${escapeHtml(expiryMinutes)} minutes</strong>. Please use it before it expires.
    </p>
    <div style="margin-top:26px;padding:16px 18px;background:#f6f9fc;border-radius:12px;color:#7b8794;font-size:12px;line-height:1.8">
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
  logoUrl,
  renderEmail,
  renderOtpEmail,
  unsubscribeUrl,
  preferencesUrl,
};
