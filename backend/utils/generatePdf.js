const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// produces a simple service report pdf path
async function generateServiceReportPdf(job) {
  return new Promise((resolve, reject) => {
    const fileName = `report-${job._id}.pdf`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(16).text('Service Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Job ID: ${job._id}`);
    doc.text(`Company ID: ${job.company_id}`);
    doc.text(`Client ID: ${job.client_id}`);
    doc.text(`Technician ID: ${job.assigned_user_id}`);
    doc.text(`Date: ${job.completed_at || new Date()}`);
    doc.moveDown();

    if (job.supplies_used && job.supplies_used.length) {
      doc.text('Supplies Used:');
      job.supplies_used.forEach(item => {
        doc.text(`- ${item.name}: ${item.quantity}`);
      });
      doc.moveDown();
    }

    if (job.photos && job.photos.length) {
      doc.text('Photos (links):');
      job.photos.forEach(url => doc.text(url));
      doc.moveDown();
    }

    doc.end();

    writeStream.on('finish', () => {
      resolve(filePath);
    });
    writeStream.on('error', reject);
  });
}

module.exports = { generateServiceReportPdf };