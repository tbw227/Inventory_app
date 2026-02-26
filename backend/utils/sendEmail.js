const nodemailer = require('nodemailer');

// simple transporter configuration using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, text, attachments = [] }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@firetrack.com',
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