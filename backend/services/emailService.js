const { sendEmail } = require('../utils/sendEmail');

/**
 * Send service report email to client.
 * @param {Object} job - Populated job (client_id may have contact_info)
 * @param {string} pdfPath - Path to the report PDF
 * @param {string} [toEmail] - Override recipient (e.g. from request body)
 */
async function sendReportEmail(job, pdfPath, toEmail) {
  let to = toEmail;
  if (!to && job.client_id && typeof job.client_id === 'object' && job.client_id.contact_info) {
    const match = job.client_id.contact_info.match(/\S+@\S+\.\S+/);
    if (match) to = match[0];
  }
  if (!to) {
    console.warn('No recipient email for service report; skipping send.');
    return;
  }
  await sendEmail({
    to,
    subject: 'Service Report',
    text: 'Your service report is attached.',
    attachments: [{ filename: 'service-report.pdf', path: pdfPath }],
  });
}

module.exports = sendReportEmail;
