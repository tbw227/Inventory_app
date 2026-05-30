const request = require('supertest');
const prisma = require('../../lib/prisma');
const { createTestData } = require('../helpers');

require('../setup');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';

const app = require('../../app');

const sampleLine = {
  item_name: 'Test hose',
  quantity: 2,
  stocked_at: new Date().toISOString(),
  expires_at: null,
  is_fire_extinguisher: false,
  placement_note: '',
};

describe('Vehicle inventory routes', () => {
  let admin;
  let tech;
  let adminToken;
  let techToken;

  beforeEach(async () => {
    const data = await createTestData();
    admin = data.admin;
    tech = data.tech;
    adminToken = data.adminToken;
    techToken = data.techToken;
  });

  it('technician can update own vehicle inventory via /me', async () => {
    const res = await request(app)
      .put('/api/users/me/vehicle-inventory')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ vehicle_inventory: [sampleLine] });

    expect(res.status).toBe(200);
    expect(res.body.vehicle_inventory).toHaveLength(1);
    expect(res.body.vehicle_inventory[0].item_name).toBe('Test hose');

    const row = await prisma.user.findUnique({ where: { id: tech.id }, select: { vehicleInventory: true } });
    expect(Array.isArray(row.vehicleInventory)).toBe(true);
    expect(row.vehicleInventory[0].item_name).toBe('Test hose');
  });

  it('admin can update a technician vehicle inventory', async () => {
    const res = await request(app)
      .put(`/api/users/${tech.id}/vehicle-inventory`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicle_inventory: [sampleLine] });

    expect(res.status).toBe(200);
    expect(res.body.vehicle_inventory[0].quantity).toBe(2);
  });

  it('rejects vehicle inventory for admin users', async () => {
    const res = await request(app)
      .put(`/api/users/${admin.id}/vehicle-inventory`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicle_inventory: [sampleLine] });

    expect(res.status).toBe(400);
  });
});
