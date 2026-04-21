const jobService = require('../services/jobService');

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
