const paymentService = require('../services/paymentService');

exports.createIntent = async (req, res, next) => {
  try {
    const { job_id, amount, currency } = req.validatedData;
    const result = await paymentService.createPaymentIntent(
      req.user.company_id,
      job_id,
      req.user._id,
      amount,
      currency,
      req.user.role
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.listByJob = async (req, res, next) => {
  try {
    const payments = await paymentService.listPaymentsByJob(
      req.user.company_id,
      req.params.jobId,
      req.user.role,
      req.user._id
    );
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

exports.revenueStats = async (req, res, next) => {
  try {
    const stats = await paymentService.getRevenueStats(req.user.company_id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

exports.revenueByJob = async (req, res, next) => {
  try {
    const rows = await paymentService.getRevenueByJob(req.user.company_id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
