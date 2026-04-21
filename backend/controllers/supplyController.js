const supplyService = require('../services/supplyService');
const supplyImportService = require('../services/supplyImportService');

const isAdminUser = (u) => u && String(u.role) === 'admin';

exports.list = async (req, res, next) => {
  try {
    const supplies = await supplyService.listSupplies(req.user.company_id, req.query, {
      includePricing: isAdminUser(req.user),
    });
    res.json(supplies);
  } catch (err) {
    next(err);
  }
};

exports.overview = async (req, res, next) => {
  try {
    const data = await supplyService.getInventoryOverview(req.user.company_id, {
      includePricing: isAdminUser(req.user),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const supply = await supplyService.createSupply(req.user.company_id, req.validatedData);
    res.status(201).json(supply);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const supply = await supplyService.updateSupply(req.user.company_id, req.params.id, req.validatedData);
    res.json(supply);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await supplyService.deleteSupply(req.user.company_id, req.params.id);
    res.json({ message: 'Supply deleted' });
  } catch (err) {
    next(err);
  }
};

exports.importPreview = async (req, res, next) => {
  try {
    const out = await supplyImportService.previewImport(req.user.company_id, req.validatedData.items);
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.importCommit = async (req, res, next) => {
  try {
    const out = await supplyImportService.commitImport(
      req.user.company_id,
      req.user._id,
      req.validatedData.items,
      req.validatedData.file_name
    );
    res.status(202).json(out);
  } catch (err) {
    next(err);
  }
};

exports.importJobStatus = async (req, res, next) => {
  try {
    const out = await supplyImportService.getImportJob(req.user.company_id, req.params.jobId);
    res.json(out);
  } catch (err) {
    next(err);
  }
};
