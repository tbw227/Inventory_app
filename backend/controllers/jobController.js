const jobService = require('../services/jobService');
const invoiceService = require('../services/invoiceService');
const prisma = require('../lib/prisma');

exports.list = async (req, res, next) => {
  try {
    const jobs = await jobService.listJobs(req.user.company_id, req.user.role, req.user._id, req.query);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const job = await jobService.getJob(req.user.company_id, req.params.id, req.user.role, req.user._id);
    res.json(job);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const job = await jobService.createJob(req.user.company_id, req.validatedData);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.user.company_id, req.params.id, req.validatedData);
    res.json(job);
  } catch (err) {
    next(err);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const data = req.validatedData || req.body;
    const job = await jobService.completeJob(req.user.company_id, req.params.id, req.user.role, req.user._id, data);
    res.json({ message: 'Job completed and report sent', job });
  } catch (err) {
    next(err);
  }
};

exports.invoice = async (req, res, next) => {
  try {
    if (req.user.role === 'technician') {
      const job = await prisma.job.findFirst({
        where: { id: String(req.params.id), companyId: String(req.user.company_id) },
        select: { assignedUserId: true },
      });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (String(job.assignedUserId || '') !== String(req.user._id)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const invoice = await invoiceService.buildInvoice(req.user.company_id, req.params.id);

    const { email, send } = req.body || {};
    if (send) {
      const result = await invoiceService.sendInvoiceEmail(invoice, email || undefined);
      return res.json({ message: 'Invoice sent', sent_to: result.sent_to, invoice });
    }

    res.json({ invoice });
  } catch (err) {
    next(err);
  }
};

exports.addInventoryUsed = async (req, res, next) => {
  try {
    const data = req.validatedData || req.body;
    const job = await jobService.addInventoryUsed(req.user.company_id, req.params.id, req.user.role, req.user._id, data);
    res.json({ message: 'Job inventory updated', job });
  } catch (err) {
    next(err);
  }
};
