
const express = require('express');
const { escapeHtml, renderEmail } = require('../utils/emailTemplates');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, website } = req.body;

    // Honeypot field: silently accept submissions from simple bots.
    if (website) {
      return res.status(200).json({
        success: true,
        message: 'Your message has been submitted successfully.',
      });
    }

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (!cleanName || !cleanEmail || !cleanSubject || !cleanMessage) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (
      cleanName.length > 100 ||
      cleanEmail.length > 254 ||
      cleanSubject.length > 150 ||
      cleanMessage.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: 'One or more fields exceed the allowed length.',
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'CodeSphere';
    const receiverEmail =
      process.env.CONTACT_RECEIVER_EMAIL;

    if (!apiKey || !senderEmail || !receiverEmail) {
      console.error('Contact email configuration is incomplete.');

      return res.status(500).json({
        success: false,
        message: 'The contact service is temporarily unavailable.',
      });
    }

    const safeName = escapeHtml(cleanName);
    const safeEmail = escapeHtml(cleanEmail);
    const safeSubject = escapeHtml(cleanSubject);
    const safeMessage = escapeHtml(cleanMessage).replace(/\n/g, '<br>');

    const emailPayload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: receiverEmail,
          name: 'CodeSphere Contact',
        },
      ],
      replyTo: {
        email: cleanEmail,
        name: cleanName,
      },
      subject: `Website Contact Us: ${cleanSubject}`,

      htmlContent: renderEmail({
        preheader: `${cleanSubject} — ${cleanName}`,
        eyebrow: 'WEBSITE CONTACT FORM',
        title: 'Someone wants to connect!',
        intro: 'A new message has been submitted through the CodeSphere website.',
        body: `
          <div style="padding:20px;border:1px solid #e5edf4;border-radius:12px;background:#f8fafc">
            <div style="margin-bottom:16px">
              <div style="margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#8293a5">Name</div>
              <div style="font-size:14px;font-weight:600;color:#10243a">${safeName}</div>
            </div>
            <div style="margin-bottom:16px">
              <div style="margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#8293a5">Email address</div>
              <div style="font-size:14px;color:#2875a8;word-break:break-word">${safeEmail}</div>
            </div>
            <div>
              <div style="margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#8293a5">Subject</div>
              <div style="font-size:14px;font-weight:600;color:#10243a">${safeSubject}</div>
            </div>
          </div>
          <div style="margin-top:24px">
            <div style="margin-bottom:10px;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#536579">Message</div>
            <div style="padding:20px;border-left:4px solid #df542f;border-radius:0 10px 10px 0;background:#fff8f5;font-size:14px;line-height:1.8;color:#334155;overflow-wrap:anywhere">${safeMessage}</div>
          </div>
          <div style="margin-top:26px;padding:15px 18px;border-radius:10px;background:#eaf5fc">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#28516e"><strong>Quick tip:</strong> Reply directly to this email to respond to ${safeName}.</p>
          </div>`,
        internal: true,
        footerNote: `Reply directly to ${cleanEmail}.`,
      }),

      textContent: [
        'New Contact Form Message',
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Subject: ${cleanSubject}`,
        '',
        'Message:',
        cleanMessage,
      ].join('\n'),
    };

    const brevoResponse = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      }
    );

    if (!brevoResponse.ok) {
      const errorDetails = await brevoResponse.text();
      console.error('Brevo contact email error:', errorDetails);

      return res.status(502).json({
        success: false,
        message: 'Your message could not be sent. Please try again later.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully!',
    });
  } catch (error) {
    console.error('Contact form error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
});

module.exports = router;
