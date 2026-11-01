
require('dotenv').config();

async function testBrevo() {
  const recipient = '75tuhina@gmail.com';

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is missing from .env');
    return;
  }

  if (!process.env.BREVO_SENDER_EMAIL) {
    console.error('❌ BREVO_SENDER_EMAIL is missing from .env');
    return;
  }

  try {
    console.log('Sending test email through Brevo...');

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CodeSphere',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: recipient }],
        subject: 'CodeSphere - Brevo Email Test',
        textContent:
          'Congratulations! Your CodeSphere email service is working.',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo rejected the request:');
      console.error(result);
      return;
    }

    console.log('✅ Brevo accepted your test email!');
    console.log('Message ID:', result.messageId);
    console.log('Check your inbox and spam folder.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBrevo();
