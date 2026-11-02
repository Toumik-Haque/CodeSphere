
const express = require('express');

const router = express.Router();

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });

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

      htmlContent: `
      <div style="margin:0; padding:35px 15px; background-color:#F1F5F9; font-family:Arial,Helvetica,sans-serif; color:#10243A;">
        <div style="max-width:620px; margin:0 auto; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #E2E8F0;">
      
          <!-- Header -->
          <div style="padding:28px 32px; background:linear-gradient(135deg,#10243A,#1D4565);">
            <div style="font-size:25px; font-weight:800; letter-spacing:-0.5px; color:#FFFFFF;">
              Code<span style="color:#FF8568;">Sphere</span>
            </div>
            <div style="margin-top:8px; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#BFD7E8;">
              Website Contact Form
            </div>
          </div>
      
          <!-- Content -->
          <div style="padding:32px;">
            <div style="display:inline-block; padding:7px 12px; border-radius:20px; background-color:#FFF0EB; color:#D94324; font-size:11px; font-weight:700; letter-spacing:0.7px; text-transform:uppercase;">
              New Message Received
            </div>
      
            <h2 style="margin:18px 0 8px; font-size:24px; line-height:1.3; color:#10243A;">
              Someone wants to connect!
            </h2>
      
            <p style="margin:0 0 26px; font-size:14px; line-height:1.7; color:#64748B;">
              A new message has been submitted through the CodeSphere website. Here are the details:
            </p>
      
            <!-- Sender Details -->
            <div style="padding:20px; border:1px solid #E5EDF4; border-radius:12px; background-color:#F8FAFC;">
              <div style="margin-bottom:16px;">
                <div style="margin-bottom:5px; font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#8293A5;">
                  Name
                </div>
                <div style="font-size:14px; font-weight:600; color:#10243A;">
                  ${safeName}
                </div>
              </div>
      
              <div style="margin-bottom:16px;">
                <div style="margin-bottom:5px; font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#8293A5;">
                  Email Address
                </div>
                <div style="font-size:14px; color:#2875A8; word-break:break-word;">
                  ${safeEmail}
                </div>
              </div>
      
              <div>
                <div style="margin-bottom:5px; font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#8293A5;">
                  Subject
                </div>
                <div style="font-size:14px; font-weight:600; color:#10243A;">
                  ${safeSubject}
                </div>
              </div>
            </div>
      
            <!-- Message -->
            <div style="margin-top:24px;">
              <div style="margin-bottom:10px; font-size:12px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#536579;">
                Message
              </div>
      
              <div style="padding:20px; border-left:4px solid #F05A36; border-radius:0 10px 10px 0; background-color:#FFF8F5; font-size:14px; line-height:1.8; color:#334155; overflow-wrap:anywhere;">
                ${safeMessage}
              </div>
            </div>
      
            <!-- Reply Reminder -->
            <div style="margin-top:26px; padding:15px 18px; border-radius:10px; background-color:#EAF5FC;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#28516E;">
                <strong>Quick tip:</strong> You can reply directly to this email to respond to ${safeName}.
              </p>
            </div>
          </div>
      
          <!-- Footer -->
          <div style="padding:20px 30px; border-top:1px solid #E8EEF4; background-color:#F8FAFC; text-align:center;">
            <p style="margin:0; font-size:12px; color:#64748B;">
              This message was sent through the
              <strong style="color:#10243A;">CodeSphere</strong> website contact form.
            </p>
            <p style="margin:8px 0 0; font-size:11px; color:#94A3B8;">
              © ${new Date().getFullYear()} CodeSphere. All rights reserved.
            </p>
          </div>
      
        </div>
      </div>
      `,

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
