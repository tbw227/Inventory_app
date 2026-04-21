const request = require('supertest');
const prisma = require('../../lib/prisma');
const { createTestData } = require('../helpers');

require('../setup');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';

const { hashPassword } = require('../../utils/auth');

const app = require('../../app');

describe('Jobs Routes', () => {
  let company;
  let tech;
  let client;
  let adminToken;
  let techToken;
  let supply;

  beforeEach(async () => {
    const data = await createTestData();
    company = data.company;
    tech = data.tech;
    client = data.client;
    adminToken = data.adminToken;
    techToken = data.techToken;

    supply = await prisma.supply.create({
      data: {
        companyId: company.id,
        name: 'Bandages',
        quantityOnHand: 50,
        reorderThreshold: 5,
      },
    });
  });

  describe('GET /api/jobs', () => {
    it('should return jobs for the authenticated user company', async () => {
      await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          scheduledDate: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/jobs');
      expect(response.status).toBe(401);
    });

    it('should filter by status', async () => {
      await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          scheduledDate: new Date(),
          status: 'completed',
        },
      });
      await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          scheduledDate: new Date(),
          status: 'pending',
        },
      });

      const response = await request(app)
        .get('/api/jobs?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('pending');
    });

    it('should only return assigned jobs for technicians', async () => {
      const otherTech = await prisma.user.create({
        data: {
          companyId: company.id,
          role: 'technician',
          name: 'Other Tech',
          email: 'other@test.com',
          passwordHash: await hashPassword('OtherTech1!'),
        },
      });

      await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          scheduledDate: new Date(),
        },
      });
      await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: otherTech.id,
          scheduledDate: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${techToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return a single job with populated fields', async () => {
      const job = await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          description: 'Test job',
          scheduledDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Test job');
      expect(response.body.client_id.name).toBe('Test Client');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a job (admin only)', async () => {
      const jobData = {
        client_id: client.id,
        assigned_user_id: tech.id,
        description: 'New inspection',
        scheduled_date: new Date(),
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('pending');
      expect(response.body.description).toBe('New inspection');
    });

    it('should return 403 for technicians', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          client_id: client.id,
          assigned_user_id: tech.id,
          scheduled_date: new Date(),
        });

      expect(response.status).toBe(403);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ client_id: 'not-a-uuid' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/jobs/:id/complete', () => {
    it('should complete a job and decrement inventory', async () => {
      const job = await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          scheduledDate: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/jobs/${job.id}/complete`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          suppliesUsed: [{ name: 'Bandages', quantity: 5 }],
          photos: ['https://example.com/photo.jpg'],
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('completed');

      const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
      expect(updatedJob.status).toBe('completed');

      const updatedSupply = await prisma.supply.findUnique({ where: { id: supply.id } });
      expect(updatedSupply.quantityOnHand).toBe(45);
    });

    it('should prevent completing an already completed job', async () => {
      const job = await prisma.job.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          assignedUserId: tech.id,
          scheduledDate: new Date(),
          status: 'completed',
        },
      });

      const response = await request(app)
        .post(`/api/jobs/${job.id}/complete`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .post('/api/jobs/00000000-0000-0000-0000-000000000000/complete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });
});
