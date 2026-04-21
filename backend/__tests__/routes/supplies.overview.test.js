const request = require('supertest');
const { Prisma } = require('@prisma/client');
const prisma = require('../../lib/prisma');
const { createTestData } = require('../helpers');

require('../setup');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';

const app = require('../../app');

describe('GET /api/supplies/overview', () => {
  let adminToken;
  let techToken;
  let company;
  let client;

  beforeEach(async () => {
    const data = await createTestData();
    adminToken = data.adminToken;
    techToken = data.techToken;
    company = data.company;
    client = data.client;

    await prisma.supply.create({
      data: {
        companyId: company.id,
        name: 'Bandages',
        quantityOnHand: 10,
        reorderThreshold: 2,
        unitPrice: new Prisma.Decimal('12.5'),
        minOrderQty: 1,
        minOrderUnitPrice: new Prisma.Decimal('12.5'),
      },
    });

    await prisma.location.create({
      data: {
        companyId: company.id,
        clientId: client.id,
        name: 'Site A',
        stationInventory: [
          {
            item_name: 'FE-10',
            quantity: 1,
            stocked_at: new Date(),
            is_fire_extinguisher: true,
            placement_note: 'Hall',
          },
        ],
      },
    });
  });

  it('returns shop, clients, and totals for admin', async () => {
    const res = await request(app)
      .get('/api/supplies/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.shop)).toBe(true);
    expect(res.body.shop.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.clients)).toBe(true);
    expect(res.body.totals).toMatchObject({
      shop_skus: expect.any(Number),
      shop_units: expect.any(Number),
      client_station_lines: expect.any(Number),
      client_fire_extinguisher_units: expect.any(Number),
    });
    expect(res.body.totals.client_fire_extinguisher_units).toBe(1);
    const bandage = res.body.shop.find((s) => s.name === 'Bandages');
    expect(bandage).toBeDefined();
    expect(bandage.unit_price).toBe(12.5);
    expect(bandage.min_order_qty).toBe(1);
    expect(bandage.min_order_unit_price).toBe(12.5);
  });

  it('allows technicians', async () => {
    const res = await request(app)
      .get('/api/supplies/overview')
      .set('Authorization', `Bearer ${techToken}`);

    expect(res.status).toBe(200);
    expect(res.body.shop).toBeDefined();
    const bandage = res.body.shop.find((s) => s.name === 'Bandages');
    expect(bandage).toBeDefined();
    expect(bandage.unit_price).toBeUndefined();
    expect(bandage.min_order_qty).toBeUndefined();
    expect(bandage.min_order_unit_price).toBeUndefined();
  });

  it('rejects without token', async () => {
    const res = await request(app).get('/api/supplies/overview');
    expect(res.status).toBe(401);
  });
});
