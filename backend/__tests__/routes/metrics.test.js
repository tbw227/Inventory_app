process.env.METRICS_ENABLED = 'true';

const request = require('supertest');
const app = require('../../app');

describe('GET /metrics', () => {
  it('returns Prometheus text when enabled', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('inventory_http_requests_total');
    expect(res.text).toContain('inventory_process_cpu');
  });
});
