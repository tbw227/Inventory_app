const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const supplyService = require('./supplyService');

const MAX_IMPORT_ROWS = 5000;

function normalizeImportItem(raw, index) {
  const rowNum = index + 1;
  const name = String(raw?.name ?? '').trim();
  if (!name) {
    return { ok: false, rowNum, error: 'Name is required' };
  }
  if (name.length > 100) {
    return { ok: false, rowNum, error: 'Name must be at most 100 characters' };
  }
  const out = {
    name,
    category: raw?.category,
    quantity_on_hand: raw?.quantity_on_hand,
    reorder_threshold: raw?.reorder_threshold,
    unit_price: raw?.unit_price,
  };
  return { ok: true, rowNum, item: out };
}

function validateItemsForPreview(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items must be a non-empty array', 400);
  }
  if (items.length > MAX_IMPORT_ROWS) {
    throw new AppError(`At most ${MAX_IMPORT_ROWS} rows per import`, 400);
  }
  const errors = [];
  const normalized = [];
  for (let i = 0; i < items.length; i += 1) {
    const r = normalizeImportItem(items[i], i);
    if (!r.ok) {
      errors.push({ row: r.rowNum, message: r.error });
      continue;
    }
    try {
      if (
        r.item.unit_price !== undefined &&
        r.item.unit_price !== null &&
        r.item.unit_price !== ''
      ) {
        const n = Number(r.item.unit_price);
        if (!Number.isFinite(n) || n < 0) {
          errors.push({ row: r.rowNum, message: 'unit_price must be a non-negative number' });
          continue;
        }
      }
    } catch {
      errors.push({ row: r.rowNum, message: 'Invalid unit_price' });
      continue;
    }
    normalized.push(r.item);
  }
  return { normalized, errors, valid: errors.length === 0 };
}

async function previewImport(companyId, items) {
  const { normalized, errors, valid } = validateItemsForPreview(items);
  return {
    valid,
    row_count: items.length,
    valid_row_count: normalized.length,
    errors,
    preview: normalized.slice(0, 25),
  };
}

async function commitImport(companyId, userId, items, fileName) {
  const { normalized, errors, valid } = validateItemsForPreview(items);
  if (!valid) {
    throw new AppError('Fix validation errors before committing', 400);
  }

  const jobId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.supplyImportJob.create({
      data: {
        id: jobId,
        companyId: String(companyId),
        createdByUserId: userId ? String(userId) : null,
        type: 'csv_supply',
        status: 'pending',
        fileName: fileName ? String(fileName).slice(0, 255) : null,
      },
    });
    await tx.supplyImportRow.createMany({
      data: normalized.map((payload, idx) => ({
        id: randomUUID(),
        jobId,
        rowIndex: idx,
        payload,
        status: 'pending',
      })),
    });
  });

  scheduleSupplyImportJob(jobId);
  return { job_id: jobId, status: 'pending', rows: normalized.length };
}

function scheduleSupplyImportJob(jobId) {
  setImmediate(() => {
    processSupplyImportJob(jobId).catch((err) => {
      console.error('supply import job failed', jobId, err);
    });
  });
}

async function processSupplyImportJob(jobId) {
  const jid = String(jobId);
  const locked = await prisma.supplyImportJob.updateMany({
    where: { id: jid, status: 'pending' },
    data: { status: 'processing' },
  });
  if (locked.count === 0) {
    return;
  }

  const job = await prisma.supplyImportJob.findUnique({
    where: { id: jid },
    include: { rows: { orderBy: { rowIndex: 'asc' } } },
  });
  if (!job) {
    return;
  }

  const items = job.rows.map((r) => r.payload);
  try {
    const { created } = await supplyService.bulkCreateSupplies(job.companyId, items);
    await prisma.$transaction([
      prisma.supplyImportRow.updateMany({
        where: { jobId: jid },
        data: { status: 'success' },
      }),
      prisma.supplyImportJob.update({
        where: { id: jid },
        data: {
          status: 'completed',
          result: { created },
          errorMessage: null,
        },
      }),
    ]);
  } catch (err) {
    const message = err?.message || 'Import failed';
    await prisma.supplyImportJob.update({
      where: { id: jid },
      data: {
        status: 'failed',
        errorMessage: message.slice(0, 2000),
        result: null,
      },
    });
    await prisma.supplyImportRow.updateMany({
      where: { jobId: jid },
      data: { status: 'error', errorMessage: message.slice(0, 500) },
    });
  }
}

async function getImportJob(companyId, jobId) {
  const job = await prisma.supplyImportJob.findFirst({
    where: { id: String(jobId), companyId: String(companyId) },
    select: {
      id: true,
      status: true,
      type: true,
      fileName: true,
      result: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { rows: true } },
    },
  });
  if (!job) {
    throw new AppError('Import job not found', 404);
  }
  return {
    job_id: job.id,
    status: job.status,
    type: job.type,
    file_name: job.fileName,
    result: job.result,
    error_message: job.errorMessage,
    row_count: job._count.rows,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

module.exports = {
  previewImport,
  commitImport,
  getImportJob,
  scheduleSupplyImportJob,
  processSupplyImportJob,
  MAX_IMPORT_ROWS,
};
