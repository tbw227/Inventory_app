const nodemailer = require('nodemailer');

const mailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.example.com';
const mailPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || '587';
const mailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const mailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const mailFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'no-reply@firetrack.com';

// simple transporter configuration using environment variables
const transporter = nodemailer.createTransport({
  host: mailHost,
  port: parseInt(mailPort, 10),
  secure: parseInt(mailPort, 10) === 465,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
});

async function sendEmail({ to, subject, text, attachments = [] }) {
  if (!mailUser || !mailPass) {
    console.error('Email error: missing SMTP credentials (SMTP_USER/SMTP_PASS)');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      attachments,
    });
    console.log('Email sent:', info.messageId);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendEmail };