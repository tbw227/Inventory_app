const supplyService = require('../services/supplyService');
const supplyImportService = require('../services/supplyImportService');
const { sendEmail } = require('../utils/sendEmail');

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

function toCsvRow(values) {
  return values
    .map((v) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

function inventoryCsv(rows) {
  const header = [
    'Item ID',
    'Name',
    'Category',
    'Quantity On Hand',
    'Reorder Threshold',
    'Catalog Group',
    'Qty Per Unit',
    'Case Qty',
    'Min Order Qty',
    'Min Order Unit Price',
    'Discount R Qty',
    'Discount R Unit Price',
    'Discount N Qty',
    'Discount N Unit Price',
    'Unit Price',
  ];
  const lines = [toCsvRow(header)];
  for (const r of rows) {
    lines.push(
      toCsvRow([
        r._id,
        r.name,
        r.category || '',
        r.quantity_on_hand ?? '',
        r.reorder_threshold ?? '',
        r.catalog_group ?? '',
        r.qty_per_unit ?? '',
        r.case_qty ?? '',
        r.min_order_qty ?? '',
        r.min_order_unit_price ?? '',
        r.discount_r_qty ?? '',
        r.discount_r_unit_price ?? '',
        r.discount_n_qty ?? '',
        r.discount_n_unit_price ?? '',
        r.unit_price ?? '',
      ])
    );
  }
  return lines.join('\n');
}

exports.exportEmail = async (req, res, next) => {
  try {
    const includeAll = Boolean(req.validatedData.include_all);
    const itemIds = includeAll ? [] : req.validatedData.item_ids || [];
    const rows = await supplyService.getSuppliesForExport(req.user.company_id, itemIds, {
      includePricing: true,
    });
    if (!rows.length) {
      return res.status(400).json({ error: 'No inventory items matched your selection' });
    }
    const csv = inventoryCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    await sendEmail({
      to: req.validatedData.recipient,
      subject: `Inventory export (${rows.length} item${rows.length === 1 ? '' : 's'})`,
      text: `Attached is your inventory export with ${rows.length} item${rows.length === 1 ? '' : 's'}.`,
      attachments: [
        {
          filename: `inventory-export-${stamp}.csv`,
          content: csv,
          contentType: 'text/csv',
        },
      ],
    });
    res.json({
      message: 'Inventory export email queued',
      count: rows.length,
      recipient: req.validatedData.recipient,
    });
  } catch (err) {
    next(err);
  }
};
