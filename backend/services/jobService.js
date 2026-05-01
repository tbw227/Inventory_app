const prisma = require('../lib/prisma');
const generateServiceReportPdf = require('./pdfService');
const sendReportEmail = require('./emailService');
const AppError = require('../utils/AppError');
const {
  formatClient,
  formatLocation,
  formatUserShort,
} = require('../utils/legacyApiShape');

const jobIncludeList = {
  client: {
    select: {
      id: true,
      name: true,
      location: true,
      serviceStartDate: true,
      serviceExpiryDate: true,
    },
  },
  location: { select: { id: true, name: true, address: true, locationCode: true } },
  assignedUser: { select: { id: true, name: true } },
  jobLocations: {
    include: {
      location: { select: { id: true, name: true, address: true, locationCode: true } },
    },
  },
};

const jobIncludeDetail = {
  client: {
    select: {
      id: true,
      name: true,
      location: true,
      contactInfo: true,
      serviceStartDate: true,
      serviceExpiryDate: true,
    },
  },
  location: { select: { id: true, name: true, address: true, locationCode: true } },
  assignedUser: { select: { id: true, name: true, email: true } },
  jobLocations: {
    include: {
      location: { select: { id: true, name: true, address: true, locationCode: true } },
    },
  },
  payments: {
    include: { technician: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  },
};

function formatJob(j, { detail = false } = {}) {
  const orderedLocs = (j.jobLocations || []).map((jl) => jl.location).filter(Boolean);
  const primaryLoc = j.location || orderedLocs[0] || null;
  const locationIdsShape =
    orderedLocs.length > 0
      ? orderedLocs.map((loc) => formatLocation(loc, { nestClient: false }))
      : primaryLoc
        ? [formatLocation(primaryLoc, { nestClient: false })]
        : [];

  const billingAmount = j.billingAmount;
  let remaining_balance = null;
  if (billingAmount != null) {
    const paid = Number(j.totalPaid) || 0;
    remaining_balance = Math.round(Math.max(0, billingAmount - paid) * 100) / 100;
  }

  const base = {
    _id: j.id,
    company_id: j.companyId,
    client_id: j.client ? formatClient(j.client) : j.clientId,
    location_id: primaryLoc ? formatLocation(primaryLoc, { nestClient: false }) : j.locationId,
    location_ids: locationIdsShape,
    locations: locationIdsShape,
    assigned_user_id: j.assignedUser ? formatUserShort(j.assignedUser) : j.assignedUserId,
    description: j.description,
    scheduled_date: j.scheduledDate,
    status: j.status,
    planned_supplies: Array.isArray(j.plannedSupplies) ? j.plannedSupplies : j.plannedSupplies || [],
    supplies_used: Array.isArray(j.suppliesUsed) ? j.suppliesUsed : j.suppliesUsed || [],
    photos: j.photos || [],
    notes: j.notes,
    completed_at: j.completedAt,
    service_report_url: j.serviceReportUrl,
    total_paid: j.totalPaid,
    billing_amount: j.billingAmount,
    remaining_balance,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };

  if (detail && j.payments) {
    base.payments = j.payments.map((p) => ({
      _id: p.id,
      company_id: p.companyId,
      job_id: p.jobId,
      technician_id: p.technician ? formatUserShort(p.technician) : p.technicianId,
      amount: p.amount,
      currency: p.currency,
      stripe_payment_intent_id: p.stripePaymentIntentId,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  return base;
}

function normalizeJobLocationPayload(data) {
  if (!data || typeof data !== 'object') return data;
  const next = { ...data };
  const hasIds = Object.prototype.hasOwnProperty.call(next, 'location_ids');
  const hasOne = Object.prototype.hasOwnProperty.call(next, 'location_id');
  if (hasIds) {
    next.location_ids = Array.isArray(next.location_ids) ? next.location_ids.filter(Boolean) : [];
    if (next.location_ids.length) {
      next.location_id = next.location_ids[0];
    } else {
      next.location_id = undefined;
    }
  } else if (hasOne) {
    if (next.location_id) {
      next.location_ids = [next.location_id];
    } else {
      next.location_ids = [];
      next.location_id = undefined;
    }
  }
  return next;
}

async function syncJobLocations(tx, jobId, locationIds) {
  await tx.jobLocation.deleteMany({ where: { jobId: String(jobId) } });
  const uniq = [...new Set((locationIds || []).map(String).filter(Boolean))];
  if (!uniq.length) return;
  await tx.jobLocation.createMany({
    data: uniq.map((locationId) => ({ jobId: String(jobId), locationId })),
  });
}

function prismaCreateData(companyId, body) {
  const n = normalizeJobLocationPayload({ ...body, company_id: companyId });
  const locIds = (n.location_ids || []).map(String).filter(Boolean);
  const first = locIds[0] || null;
  const data = {
    companyId: String(companyId),
    clientId: String(n.client_id),
    assignedUserId: String(n.assigned_user_id),
    description: n.description ?? '',
    scheduledDate: new Date(n.scheduled_date),
    status: n.status || 'pending',
    plannedSupplies: n.planned_supplies ?? [],
    suppliesUsed: n.supplies_used ?? [],
    photos: n.photos ?? [],
    notes: n.notes ?? '',
    billingAmount: n.billing_amount != null ? Number(n.billing_amount) : null,
    locationId: first,
  };
  if (locIds.length > 0) {
    data.jobLocations = {
      create: locIds.map((locationId) => ({ locationId })),
    };
  }
  return data;
}

async function listJobs(companyId, role, userId, query) {
  const filter = { companyId: String(companyId) };
  if (role === 'technician') {
    filter.assignedUserId = String(userId);
  }
  if (query.view === 'calendar') {
    if (query.status) filter.status = query.status;
  } else if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = { not: 'completed' };
  }

  const rows = await prisma.job.findMany({
    where: filter,
    orderBy: { scheduledDate: 'desc' },
    include: jobIncludeList,
  });
  return rows.map((j) => formatJob(j));
}

async function getJob(companyId, jobId, role, userId) {
  const job = await prisma.job.findFirst({
    where: { id: String(jobId), companyId: String(companyId) },
    include: jobIncludeDetail,
  });
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  if (role === 'technician' && job.assignedUserId !== String(userId)) {
    throw new AppError('Access denied', 403);
  }
  return formatJob(job, { detail: true });
}

async function createJob(companyId, data) {
  const payload = prismaCreateData(companyId, data);
  const job = await prisma.job.create({
    data: payload,
    include: jobIncludeList,
  });
  return formatJob(job);
}

async function updateJob(companyId, jobId, data) {
  const existing = await prisma.job.findFirst({
    where: { id: String(jobId), companyId: String(companyId) },
  });
  if (!existing) {
    throw new AppError('Job not found', 404);
  }

  const payload = normalizeJobLocationPayload(data);
  const locTouched =
    Object.prototype.hasOwnProperty.call(data, 'location_ids') ||
    Object.prototype.hasOwnProperty.call(data, 'location_id');

  const update = {};
  if (payload.client_id !== undefined) update.clientId = String(payload.client_id);
  if (payload.assigned_user_id !== undefined) update.assignedUserId = String(payload.assigned_user_id);
  if (payload.description !== undefined) update.description = payload.description;
  if (payload.scheduled_date !== undefined) update.scheduledDate = new Date(payload.scheduled_date);
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.planned_supplies !== undefined) update.plannedSupplies = payload.planned_supplies;
  if (payload.supplies_used !== undefined) update.suppliesUsed = payload.supplies_used;
  if (payload.photos !== undefined) update.photos = payload.photos;
  if (payload.notes !== undefined) update.notes = payload.notes;
  if (payload.billing_amount !== undefined) {
    update.billingAmount = payload.billing_amount == null ? null : Number(payload.billing_amount);
  }

  let locIds = null;
  if (locTouched) {
    locIds = (payload.location_ids || []).map(String).filter(Boolean);
    update.locationId = locIds[0] || null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: String(jobId) },
      data: update,
    });
    if (locTouched) {
      await syncJobLocations(tx, jobId, locIds);
    }
  });

  const job = await prisma.job.findFirst({
    where: { id: String(jobId) },
    include: jobIncludeList,
  });
  return formatJob(job);
}

async function completeJob(companyId, jobId, role, userId, data) {
  const { suppliesUsed = [], photos = [], notes = '', clientEmail } = data;

  const job = await prisma.job.findFirst({ where: { id: String(jobId), companyId: String(companyId) } });
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  if (job.status === 'completed') {
    throw new AppError('Job is already completed', 400);
  }
  if (role === 'technician' && job.assignedUserId !== String(userId)) {
    throw new AppError('Only the assigned technician can complete this job', 403);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of suppliesUsed) {
      const qty = Number(item.quantity) || 0;
      const result = await tx.supply.updateMany({
        where: {
          companyId: String(companyId),
          name: item.name,
          quantityOnHand: { gte: qty },
        },
        data: { quantityOnHand: { decrement: qty } },
      });
      if (result.count === 0) {
        throw new AppError(`Insufficient stock for "${item.name}"`, 400);
      }
    }

    await tx.job.update({
      where: { id: String(jobId) },
      data: {
        suppliesUsed,
        photos,
        notes: notes || '',
        status: 'completed',
        completedAt: new Date(),
      },
    });
  });

  const populatedJob = await prisma.job.findFirst({
    where: { id: String(jobId) },
    include: jobIncludeDetail,
  });

  const shaped = formatJob(populatedJob, { detail: true });
  const pdfPath = await generateServiceReportPdf(shaped);

  await prisma.job.update({
    where: { id: String(jobId) },
    data: { serviceReportUrl: pdfPath },
  });

  const listed = await prisma.job.findFirst({
    where: { id: String(jobId) },
    include: jobIncludeList,
  });

  await sendReportEmail(shaped, pdfPath, clientEmail).catch((err) =>
    console.error('Report email failed:', err.message)
  );

  return formatJob(listed);
}

async function addInventoryUsed(companyId, jobId, role, userId, data) {
  const { items = [] } = data || {}

  const job = await prisma.job.findFirst({
    where: { id: String(jobId), companyId: String(companyId) },
    select: { id: true, status: true, assignedUserId: true, suppliesUsed: true },
  })

  if (!job) {
    throw new AppError('Job not found', 404)
  }

  if (job.status === 'completed') {
    throw new AppError('Job is already completed', 400)
  }

  if (role === 'technician' && job.assignedUserId !== String(userId)) {
    throw new AppError('Only the assigned technician can update this job', 403)
  }

  const existing = Array.isArray(job.suppliesUsed) ? job.suppliesUsed : []
  const mergedMap = new Map()

  for (const it of existing) {
    const name = it?.name
    if (!name) continue
    const qty = Number(it?.quantity) || 0
    if (qty <= 0) continue
    mergedMap.set(String(name), { name: String(name), quantity: qty })
  }

  for (const it of items) {
    const name = it?.name
    if (!name) continue
    const qty = Number(it?.quantity) || 0
    if (qty <= 0) continue
    const key = String(name)
    const prev = mergedMap.get(key)
    mergedMap.set(key, { name: key, quantity: (prev?.quantity || 0) + qty })
  }

  const suppliesUsedNext = Array.from(mergedMap.values())

  await prisma.job.update({
    where: { id: String(jobId) },
    data: { suppliesUsed: suppliesUsedNext },
  })

  const updated = await prisma.job.findFirst({
    where: { id: String(jobId) },
    include: jobIncludeList,
  })

  return formatJob(updated)
}

module.exports = {
  listJobs,
  getJob,
  createJob,
  updateJob,
  completeJob,
  addInventoryUsed,
  formatJob,
}
