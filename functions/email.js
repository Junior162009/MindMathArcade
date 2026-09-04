const {defineSecret} = require('firebase-functions/params');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EMAIL_FROM = defineSecret('EMAIL_FROM');

async function sendEmail(to, subject, htmlBody) {
  const key = RESEND_API_KEY.value();
  if (!key || !to) return false;

  const from =
    EMAIL_FROM.value() ||
    'TecnoMath <notificaciones@tecnomath.online>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: htmlBody
    })
  });

  if (!response.ok) {
    console.error('Resend:', await response.text());
    return false;
  }

  return response.json();
}

module.exports = {
  sendEmail,
  RESEND_API_KEY,
  EMAIL_FROM
};
