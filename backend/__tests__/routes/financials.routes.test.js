const request = require('supertest');

require('../setup');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';

const app = require('../../app');

describe('Financials API routes', () => {
  it.each([
    '/api/v1/financials/tax-categories',
    '/api/v1/financials/tax-summary?year=2026',
    '/api/v1/financials/transactions?year=2026&limit=200',
    '/api/financials/tax-categories',
  ])('registers %s (401 without auth, not 404)', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });
});
