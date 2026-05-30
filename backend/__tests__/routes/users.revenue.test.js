const request = require('supertest');
const prisma = require('../../lib/prisma');
const { createTestData } = require('../helpers');

require('../setup');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';

const app = require('../../app');

async function createCompletedPayment({ companyId, jobId, technicianId, amount, createdAt }) {
  const unique = `pi_test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return prisma.payment.create({
    data: {
      companyId,
      jobId,
      technicianId,
      amount,
      status: 'completed',
      stripePaymentIntentId: unique,
      ...(createdAt ? { createdAt } : {}),
    },
  });
}

describe('User profile revenue routes', () => {
  let company;
  let admin;
  let tech;
  let client;
  let adminToken;
  let techToken;
  let job;

  beforeEach(async () => {
    const data = await createTestData();
    company = data.company;
    admin = data.admin;
    tech = data.tech;
    client = data.client;
    adminToken = data.adminToken;
    techToken = data.techToken;

    job = await prisma.job.create({
      data: {
        companyId: company.id,
        clientId: client.id,
        assignedUserId: tech.id,
        scheduledDate: new Date(),
      },
    });

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    await createCompletedPayment({
      companyId: company.id,
      jobId: job.id,
      technicianId: tech.id,
      amount: 100,
      createdAt: oldDate,
    });
    await createCompletedPayment({
      companyId: company.id,
      jobId: job.id,
      technicianId: admin.id,
      amount: 50,
      createdAt: new Date(),
    });
    await createCompletedPayment({
      companyId: company.id,
      jobId: job.id,
      technicianId: tech.id,
      amount: 25,
      createdAt: new Date(),
    });
  });

  describe('GET /api/v1/users/me/revenue', () => {
    it('returns shop and tech totals for all time', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/revenue')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.shop_revenue).toBe(175);
      expect(res.body.tech_revenue).toBe(125);
      expect(res.body.days).toBeNull();
    });

    it('filters by last 30 days', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/revenue?days=30')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.shop_revenue).toBe(75);
      expect(res.body.tech_revenue).toBe(25);
      expect(res.body.days).toBe(30);
    });

    it('rejects invalid days', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/revenue?days=7')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/users/me/revenue');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/:id/revenue', () => {
    it('allows admin to fetch another member revenue', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${tech.id}/revenue`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tech_revenue).toBe(125);
      expect(res.body.shop_revenue).toBe(175);
    });

    it('forbids technicians from fetching another user revenue', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${admin.id}/revenue`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(403);
    });
  });
});
