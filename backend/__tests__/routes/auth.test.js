const request = require('supertest');
const { createTestData, TEST_CREDENTIALS } = require('../helpers');

require('../setup');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-at-least-32-characters';

const app = require('../../app');

describe('Auth Routes', () => {
  let adminToken;

  beforeEach(async () => {
    const data = await createTestData();
    adminToken = data.adminToken;
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_CREDENTIALS.adminEmail, password: TEST_CREDENTIALS.adminPassword });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(TEST_CREDENTIALS.adminEmail);
      expect(response.body.user.role).toBe('admin');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_CREDENTIALS.adminEmail, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: TEST_CREDENTIALS.adminPassword });

      expect(response.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_CREDENTIALS.adminEmail });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('rejects public registration when ALLOW_PUBLIC_REGISTRATION is not enabled', async () => {
      const prev = process.env.ALLOW_PUBLIC_REGISTRATION;
      process.env.ALLOW_PUBLIC_REGISTRATION = 'false';

      const response = await request(app).post('/api/auth/register').send({
        companyName: 'Test Co',
        name: 'New User',
        email: 'newuser@test.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/disabled/i);

      if (prev !== undefined) process.env.ALLOW_PUBLIC_REGISTRATION = prev;
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(TEST_CREDENTIALS.adminEmail);
      expect(response.body.role).toBe('admin');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
