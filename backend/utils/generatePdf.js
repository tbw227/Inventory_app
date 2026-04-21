const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function getClientName(job) {
  return (job.client_id && typeof job.client_id === 'object' && job.client_id.name) ? job.client_id.name : String(job.client_id || '');
}

function getTechnicianName(job) {
  return (job.assigned_user_id && typeof job.assigned_user_id === 'object' && job.assigned_user_id.name) ? job.assigned_user_id.name : String(job.assigned_user_id || '');
}

function getLocationNames(job) {
  const names = [];
  const many = job.location_ids;
  if (Array.isArray(many) && many.length) {
    for (const loc of many) {
      if (loc && typeof loc === 'object' && loc.name) names.push(loc.name);
    }
  }
  if (names.length) return names.join(', ');
  if (!job.location_id) return '';
  return (typeof job.location_id === 'object' && job.location_id.name) ? job.location_id.name : String(job.location_id || '');
}

async function generateServiceReportPdf(job) {
  ensureUploadsDir();

  const clientName = getClientName(job);
  const techName = getTechnicianName(job);
  const completedDate = job.completed_at ? new Date(job.completed_at).toLocaleDateString() : new Date().toLocaleDateString();

  return new Promise((resolve, reject) => {
    const fileName = `report-${job._id}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(16).text('Service Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Job ID: ${job._id}`);
    doc.text(`Client: ${clientName}`);
    const locationLine = getLocationNames(job);
    if (locationLine) doc.text(`Location(s): ${locationLine}`);
    doc.text(`Technician: ${techName}`);
    doc.text(`Date: ${completedDate}`);

    if (job.description) {
      doc.text(`Description: ${job.description}`);
    }
    doc.moveDown();

    if (job.supplies_used && job.supplies_used.length) {
      doc.text('Supplies Used:');
      job.supplies_used.forEach(item => {
        doc.text(`  - ${item.name}: ${item.quantity}`);
      });
      doc.moveDown();
    }

    if (job.notes) {
      doc.text('Notes:');
      doc.text(job.notes);
      doc.moveDown();
    }

    if (job.photos && job.photos.length) {
      doc.text('Photos:');
      job.photos.forEach((url, i) => {
        const display = url.startsWith('data:') ? `[Photo ${i + 1}]` : url;
        doc.text(`  ${display}`);
      });
      doc.moveDown();
    }

    doc.end();

    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

module.exports = { generateServiceReportPdf };
