const { Prisma, JobStatus } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { createInMemoryCache } = require('../lib/cache');

/**
 * In-process dashboard response cache. Set DASHBOARD_CACHE_TTL_MS=0 to disable.
 * Not shared across multiple Node processes — use 0 (or Redis) when horizontally scaling the API.
 */
function parseDashboardCacheTtlMs() {
  const raw = process.env.DASHBOARD_CACHE_TTL_MS;
  if (raw === undefined || raw === '') return 20_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 20_000;
  return n;
}

const dashboardCache = createInMemoryCache({
  ttlMs: parseDashboardCacheTtlMs(),
  maxKeys: 200,
});

function paymentWhereForRole(companyId, role, userId, since) {
  const base = {
    companyId: String(companyId),
    status: 'completed',
    createdAt: { gte: since },
  };
  if (role === 'technician') {
    return {
      ...base,
      job: { is: { assignedUserId: String(userId) } },
    };
  }
  return base;
}

async function getRevenueAnalytics(companyId, role, userId, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const wherePay = paymentWhereForRole(companyId, role, userId, since);
  const cid = String(companyId);
  const uid = String(userId);

  const techFilter =
    role === 'technician' ? Prisma.sql`AND j.assigned_user_id = ${uid}::uuid` : Prisma.empty;

  const [totalAgg, revenue_over_time, revenue_by_technician, revenue_by_job] = await Promise.all([
    prisma.payment.aggregate({
      where: wherePay,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw`
      SELECT to_char(date_trunc('day', p.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS _id,
             SUM(p.amount)::float AS total
      FROM payments p
      INNER JOIN jobs j ON j.id = p.job_id
      WHERE p.company_id = ${cid}::uuid
        AND p.status = 'completed'
        AND p.created_at >= ${since}
        ${techFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    role === 'admin'
      ? prisma.$queryRaw`
          SELECT p.technician_id AS technician_id,
                 SUM(p.amount)::float AS total,
                 COUNT(*)::int AS count,
                 u.name AS name
          FROM payments p
          INNER JOIN users u ON u.id = p.technician_id
          WHERE p.company_id = ${cid}::uuid
            AND p.status = 'completed'
            AND p.created_at >= ${since}
          GROUP BY p.technician_id, u.name
          ORDER BY total DESC
        `
      : Promise.resolve([]),
    role === 'admin'
      ? prisma.$queryRaw`
          SELECT j.id AS job_id,
                 SUM(p.amount)::float AS total,
                 COUNT(p.id)::int AS payment_count,
                 c.name AS client_name,
                 j.scheduled_date AS scheduled_date,
                 j.status::text AS status
          FROM payments p
          INNER JOIN jobs j ON j.id = p.job_id
          LEFT JOIN clients c ON c.id = j.client_id
          WHERE p.company_id = ${cid}::uuid
            AND p.status = 'completed'
            AND p.created_at >= ${since}
          GROUP BY j.id, c.name, j.scheduled_date, j.status
          ORDER BY total DESC
          LIMIT 20
        `
      : Promise.resolve([]),
  ]);

  const jobWhere = { companyId: cid };
  if (role === 'technician') {
    jobWhere.assignedUserId = uid;
  }

  const [total_jobs, jobs_completed] = await Promise.all([
    prisma.job.count({ where: jobWhere }),
    prisma.job.count({ where: { ...jobWhere, status: JobStatus.completed } }),
  ]);

  return {
    days,
    total_revenue: totalAgg._sum.amount || 0,
    completed_payments: totalAgg._count._all,
    revenue_over_time,
    revenue_by_technician,
    revenue_by_job,
    total_jobs,
    jobs_completed,
  };
}

function parsePlannedRows(plannedSupplies) {
  const arr = Array.isArray(plannedSupplies) ? plannedSupplies : [];
  return arr.map((row) => ({
    name: row?.name,
    quantity: Number(row?.quantity) || 0,
  }));
}

async function getTechnicianFieldInventory(companyId) {
  const jobs = await prisma.job.findMany({
    where: {
      companyId: String(companyId),
      status: { in: [JobStatus.pending, JobStatus.in_progress] },
    },
    include: { assignedUser: { select: { id: true, name: true, role: true } } },
  });

  const aggMap = new Map();
  const activeJobsByUser = new Map();

  for (const job of jobs) {
    const assignee = job.assignedUser;
    if (!assignee || assignee.role !== 'technician') continue;

    activeJobsByUser.set(String(assignee.id), (activeJobsByUser.get(String(assignee.id)) || 0) + 1);

    for (const row of parsePlannedRows(job.plannedSupplies)) {
      if (!row.name) continue;
      const key = `${assignee.id}::${row.name}`;
      const prev = aggMap.get(key) || { userId: assignee.id, userName: assignee.name, supplyName: row.name, qty: 0 };
      prev.qty += row.quantity;
      aggMap.set(key, prev);
    }
  }

  const byUser = new Map();
  for (const v of aggMap.values()) {
    const uid = String(v.userId);
    if (!byUser.has(uid)) {
      byUser.set(uid, { name: v.userName, items: [] });
    }
    byUser.get(uid).items.push({ name: v.supplyName, quantity: v.qty });
  }

  for (const [, row] of byUser) {
    row.items.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0));
  }

  const techs = await prisma.user.findMany({
    where: { companyId: String(companyId), role: 'technician' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return techs.map((t) => {
    const row = byUser.get(String(t.id));
    const items = row?.items || [];
    const total_units = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    return {
      user_id: t.id,
      name: t.name,
      items,
      total_units,
      line_count: items.length,
      active_jobs: activeJobsByUser.get(String(t.id)) || 0,
    };
  });
}

async function getTechJobPlannedQtyBySupplyName(companyId) {
  const jobs = await prisma.job.findMany({
    where: {
      companyId: String(companyId),
      status: { in: [JobStatus.pending, JobStatus.in_progress] },
    },
    include: { assignedUser: { select: { role: true } } },
  });

  const map = new Map();
  for (const job of jobs) {
    if (!job.assignedUser || job.assignedUser.role !== 'technician') continue;
    for (const row of parsePlannedRows(job.plannedSupplies)) {
      const k = String(row.name || '').trim();
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + row.quantity);
    }
  }
  return map;
}

async function getInventoryAnalytics(companyId, role, userId) {
  const [supplies, technician_inventory_all, plannedByName] = await Promise.all([
    prisma.supply.findMany({ where: { companyId: String(companyId) } }),
    getTechnicianFieldInventory(companyId),
    getTechJobPlannedQtyBySupplyName(companyId),
  ]);

  let technician_inventory = technician_inventory_all;
  if (role === 'technician' && userId) {
    const uid = String(userId);
    technician_inventory = technician_inventory_all.filter((t) => String(t.user_id) === uid);
  }

  let totalUnits = 0;
  let ok = 0;
  let low = 0;
  let critical = 0;
  const rows = supplies.map((s) => {
    const q = Number(s.quantityOnHand) || 0;
    const t = Number(s.reorderThreshold) || 0;
    const nameKey = String(s.name ?? '').trim();
    const quantity_planned_in_field = nameKey ? plannedByName.get(nameKey) || 0 : 0;
    totalUnits += q;
    let health = 'ok';
    if (q <= 0) {
      critical += 1;
      health = 'critical';
    } else if (q <= t) {
      low += 1;
      health = 'low';
    } else {
      ok += 1;
    }
    return {
      name: s.name,
      category: s.category || 'General',
      quantity_on_hand: q,
      reorder_threshold: t,
      health,
      quantity_planned_in_field,
    };
  });
  rows.sort((a, b) => b.quantity_on_hand - a.quantity_on_hand);
  const topByQuantity = rows.slice(0, 14);
  const pieData = [
    { name: 'Healthy stock', key: 'ok', value: ok, fill: '#2563eb' },
    { name: 'At / below reorder', key: 'low', value: low, fill: '#ca8a04' },
    { name: 'Out of stock', key: 'critical', value: critical, fill: '#db2777' },
  ].filter((p) => p.value > 0);
  let total_tech_planned_units = 0;
  for (const v of plannedByName.values()) {
    total_tech_planned_units += Number(v) || 0;
  }
  return {
    total_skus: supplies.length,
    total_units: totalUnits,
    total_tech_planned_units,
    status_counts: { ok, low, critical },
    top_by_quantity: topByQuantity,
    pie_data: pieData,
    technician_inventory,
  };
}

async function getDashboardData(companyId, role, userId, query = {}) {
  const days = Math.min(Math.max(parseInt(query.days, 10) || 30, 7), 90);
  const includeHeavy = String(query.include_heavy ?? 'true') !== 'false';

  const cid = String(companyId);
  const uid = String(userId);
  const cacheKey = `${cid}:${role}:${uid}:${days}:${includeHeavy ? 'full' : 'summary'}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) return cached;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const baseJobWhere = { companyId: cid };
  if (role === 'technician') {
    baseJobWhere.assignedUserId = uid;
  }

  const [
    todayJobs,
    completedToday,
    pendingToday,
    lowInventoryRows,
    recentReportJobs,
    analytics,
    inventoryAnalytics,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        ...baseJobWhere,
        scheduledDate: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.job.count({
      where: {
        ...baseJobWhere,
        status: JobStatus.completed,
        completedAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.job.count({
      where: {
        ...baseJobWhere,
        status: { in: [JobStatus.pending, JobStatus.in_progress] },
        scheduledDate: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.$queryRaw`
      SELECT id, name, quantity_on_hand AS qoh, reorder_threshold AS rth
      FROM supplies
      WHERE company_id = ${cid}::uuid
        AND quantity_on_hand <= reorder_threshold
    `,
    prisma.job.findMany({
      where: { ...baseJobWhere, status: JobStatus.completed },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        completedAt: true,
        serviceReportUrl: true,
        client: { select: { name: true } },
        assignedUser: { select: { name: true } },
      },
    }),
    includeHeavy ? getRevenueAnalytics(companyId, role, userId, days) : Promise.resolve(undefined),
    includeHeavy ? getInventoryAnalytics(companyId, role, userId) : Promise.resolve(undefined),
  ]);

  const lowInventory = lowInventoryRows.map((r) => ({
    _id: r.id,
    name: r.name,
    quantity_on_hand: Number(r.qoh),
    reorder_threshold: Number(r.rth),
  }));

  const recentReports = recentReportJobs.map((j) => ({
    _id: j.id,
    completed_at: j.completedAt,
    service_report_url: j.serviceReportUrl,
    client_id: { name: j.client?.name },
    assigned_user_id: { name: j.assignedUser?.name },
  }));

  const payload = {
    todayJobs,
    completedToday,
    pendingToday,
    lowInventory,
    recentReports,
  };
  if (includeHeavy) {
    payload.analytics = analytics;
    payload.inventory_analytics = inventoryAnalytics;
  }
  dashboardCache.set(cacheKey, payload);
  return payload;
}

module.exports = { getDashboardData, getRevenueAnalytics };
