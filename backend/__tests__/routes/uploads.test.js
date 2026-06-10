const fs = require('fs');
const path = require('path');
const request = require('supertest');
const prisma = require('../../lib/prisma');
const { createTestData } = require('../helpers');
const {
  PHOTOS_ROOT,
  ensureCompanyPhotosDir,
  buildPhotoUrl,
} = require('../../utils/tenantPhotos');

require('../setup');

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';

const app = require('../../app');

describe('Upload photo routes', () => {
  let company;
  let otherCompany;
  let admin;
  let client;
  let adminToken;
  let otherAdminToken;

  beforeEach(async () => {
    const data = await createTestData();
    company = data.company;
    admin = data.admin;
    client = data.client;
    adminToken = data.adminToken;

    otherCompany = await prisma.company.create({
      data: { name: 'Other Co', subscriptionTier: 'basic', subscriptionStatus: 'active' },
    });
    const { hashPassword, generateToken } = require('../../utils/auth');
    const otherAdmin = await prisma.user.create({
      data: {
        companyId: otherCompany.id,
        role: 'admin',
        name: 'Other Admin',
        email: `other-${Date.now()}@test.com`,
        passwordHash: await hashPassword('OtherAdmin1!'),
      },
    });
    otherAdminToken = generateToken({
      userId: otherAdmin.id,
      companyId: otherCompany.id,
      role: 'admin',
    });
  });

  afterEach(() => {
    if (fs.existsSync(PHOTOS_ROOT)) {
      fs.rmSync(PHOTOS_ROOT, { recursive: true, force: true });
    }
  });

  it('serves tenant-scoped photos only to the owning company', async () => {
    const filename = 'tenant-photo.webp';
    const dir = ensureCompanyPhotosDir(company.id);
    fs.writeFileSync(path.join(dir, filename), 'fake-image');

    const url = buildPhotoUrl(company.id, filename);

    const ok = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ok.status).toBe(200);

    const blocked = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(blocked.status).toBe(404);
  });

  it('blocks legacy root photos unless referenced by the tenant', async () => {
    const filename = 'legacy-photo.webp';
    fs.mkdirSync(PHOTOS_ROOT, { recursive: true });
    fs.writeFileSync(path.join(PHOTOS_ROOT, filename), 'fake-image');

    const legacyUrl = `/api/v1/uploads/photos/${filename}`;

    const blocked = await request(app)
      .get(legacyUrl)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blocked.status).toBe(404);

    await prisma.job.create({
      data: {
        companyId: company.id,
        clientId: client.id,
        assignedUserId: admin.id,
        scheduledDate: new Date(),
        photos: [legacyUrl],
      },
    });

    const allowed = await request(app)
      .get(legacyUrl)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);

    const otherBlocked = await request(app)
      .get(legacyUrl)
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(otherBlocked.status).toBe(404);
  });
});
