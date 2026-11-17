const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return transporter;
}

async function sendMail(options) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not sent: SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD must be configured');
    return false;
  }
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    ...options,
  });
  return true;
}

function sendRegistrationEmail(to, eventTitle, qrDataUrl) {
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  return sendMail({
    to,
    subject: `CampusHub registration: ${eventTitle}`,
    text: `Your registration for "${eventTitle}" is confirmed. Present the attached QR ticket at the event entrance.`,
    attachments: [{ filename: 'campushub-ticket.png', content: qrBuffer }],
  });
}

function sendCertificateEmail(to, pdfPath) {
  return sendMail({
    to,
    subject: 'Your CampusHub attendance certificate',
    text: 'Thank you for attending. Your certificate is attached.',
    attachments: [{ filename: 'campushub-certificate.pdf', path: pdfPath }],
  });
}

function sendEventReminder(to, eventTitle, startDate) {
  return sendMail({
    to,
    subject: `Reminder: ${eventTitle} is coming up`,
    text: `"${eventTitle}" begins at ${new Date(startDate).toLocaleString()}. We look forward to seeing you.`,
  });
}

module.exports = { sendRegistrationEmail, sendCertificateEmail, sendEventReminder };
