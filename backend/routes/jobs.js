const express = require('express');
const Job = require('../models/Job');
const Supply = require('../models/Supply');
const { generateServiceReportPdf } = require('../utils/generatePdf');
const { sendEmail } = require('../utils/sendEmail');

const router = express.Router();

// get jobs for a company (optionally filter by user or client)
router.get('/company/:companyId', async (req, res) => {
  try {
    const jobs = await Job.find({ company_id: req.params.companyId });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// create job
router.post('/', async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// complete a job: suppliesUsed array [{name,quantity}], photos array of URLs, clientEmail
router.post('/:id/complete', async (req, res) => {
  try {
    const jobId = req.params.id;
    const { suppliesUsed = [], photos = [], clientEmail } = req.body;

    // update job document
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // apply supplies and decrement inventory
    const supplyUpdates = suppliesUsed.map(async item => {
      // update supply quantity_on_hand
      await Supply.findOneAndUpdate(
        { company_id: job.company_id, name: item.name },
        { $inc: { quantity_on_hand: -item.quantity } }
      );
    });
    await Promise.all(supplyUpdates);

    job.supplies_used = suppliesUsed;
    job.photos = photos;
    job.status = 'completed';
    job.completed_at = new Date();

    // generate PDF and email
    const pdfPath = await generateServiceReportPdf(job);
    job.service_report_url = pdfPath;
    await job.save();

    // send email to client and admin (simple)
    if (clientEmail) {
      await sendEmail({
        to: clientEmail,
        subject: 'Service Report',
        text: 'Please find attached service report.',
        attachments: [{ filename: 'report.pdf', path: pdfPath }]
      });
    }

    res.json({ message: 'Job completed', job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;