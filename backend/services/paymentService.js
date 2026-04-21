const getStripe = require('../config/stripe');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const jobService = require('./jobService');
const { onPaymentCompleted } = require('./quickbooksService');
const subscriptionService = require('./subscriptionService');

async function createPaymentIntent(companyId, jobId, userId, amount, currency = 'usd', role = 'technician') {
  const job = await prisma.job.findFirst({
    where: { id: String(jobId), companyId: String(companyId) },
  });
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (role === 'technician' && job.assignedUserId !== String(userId)) {
    throw new AppError('Only the assigned technician can collect payment for this job', 403);
  }

  const amountInCents = Math.round(amount * 100);

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountInCents,
    currency,
    metadata: {
      jobId: String(jobId),
      technicianId: String(userId),
      companyId: String(companyId),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      companyId: String(companyId),
      jobId: String(jobId),
      technicianId: String(userId),
      amount,
      currency,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    },
  });

  return { clientSecret: paymentIntent.client_secret, paymentId: payment.id };
}

async function handleWebhookEvent(event) {
  await subscriptionService.handleStripeSubscriptionEvent(event).catch((err) => {
    console.error('Stripe subscription webhook handling:', err.message);
  });

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: intent.id },
    });
    if (!payment) return;

    if (payment.status === 'completed') {
      return;
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'completed' },
      }),
      prisma.job.update({
        where: { id: payment.jobId },
        data: { totalPaid: { increment: payment.amount } },
      }),
    ]);

    onPaymentCompleted(payment).catch((err) =>
      console.error('QuickBooks sync skipped or failed:', err.message)
    );
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: intent.id },
    });
    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });
  }
}

async function listPaymentsByJob(companyId, jobId, role, userId) {
  await jobService.getJob(companyId, jobId, role, userId);
  const rows = await prisma.payment.findMany({
    where: { companyId: String(companyId), jobId: String(jobId) },
    orderBy: { createdAt: 'desc' },
    include: { technician: { select: { id: true, name: true, email: true } } },
  });
  return rows.map((p) => ({
    _id: p.id,
    company_id: p.companyId,
    job_id: p.jobId,
    technician_id: p.technician
      ? { _id: p.technician.id, name: p.technician.name, email: p.technician.email }
      : p.technicianId,
    amount: p.amount,
    currency: p.currency,
    stripe_payment_intent_id: p.stripePaymentIntentId,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

async function getRevenueStats(companyId) {
  const cid = String(companyId);

  const [totalsAgg, byTechnicianRaw, byDayRaw] = await Promise.all([
    prisma.payment.aggregate({
      where: { companyId: cid, status: 'completed' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ['technicianId'],
      where: { companyId: cid, status: 'completed' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw`
      SELECT to_char(date_trunc('day', p.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
             SUM(amount)::float AS total,
             COUNT(*)::int AS count
      FROM payments p
      WHERE p.company_id = ${cid}::uuid AND p.status = 'completed'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 30
    `,
  ]);

  const techIds = byTechnicianRaw.map((r) => r.technicianId);
  const users = await prisma.user.findMany({
    where: { id: { in: techIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const by_technician = byTechnicianRaw.map((r) => ({
    technician_id: r.technicianId,
    name: nameById.get(r.technicianId) || 'Unknown',
    total: r._sum.amount || 0,
    count: r._count._all,
  }));

  const by_day = byDayRaw.map((row) => ({
    _id: row.day,
    total: Number(row.total) || 0,
    count: row.count,
  }));

  return {
    total_revenue: totalsAgg._sum.amount || 0,
    total_payments: totalsAgg._count._all,
    by_technician,
    by_day,
  };
}

async function getRevenueByJob(companyId) {
  const cid = String(companyId);
  const rows = await prisma.$queryRaw`
    SELECT j.id AS job_id,
           SUM(p.amount)::float AS total,
           COUNT(p.id)::int AS payment_count,
           c.name AS client_name,
           j.scheduled_date AS scheduled_date,
           j.status::text AS status
    FROM payments p
    INNER JOIN jobs j ON j.id = p.job_id
    LEFT JOIN clients c ON c.id = j.client_id
    WHERE p.company_id = ${cid}::uuid AND p.status = 'completed'
    GROUP BY j.id, c.name, j.scheduled_date, j.status
    ORDER BY total DESC
    LIMIT 50
  `;
  return rows.map((r) => ({
    job_id: r.job_id,
    total: Number(r.total) || 0,
    payment_count: r.payment_count,
    client_name: r.client_name,
    scheduled_date: r.scheduled_date,
    status: r.status,
  }));
}

module.exports = {
  createPaymentIntent,
  handleWebhookEvent,
  listPaymentsByJob,
  getRevenueStats,
  getRevenueByJob,
};
