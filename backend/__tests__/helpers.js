const prisma = require('../lib/prisma');
const { hashPassword, generateToken } = require('../utils/auth');

const TEST_CREDENTIALS = {
  adminEmail: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
  adminPassword: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin1!',
  techEmail: process.env.TEST_TECH_EMAIL || 'tech@test.com',
  techPassword: process.env.TEST_TECH_PASSWORD || 'TestTech1!',
};

async function createTestData() {
  const company = await prisma.company.create({
    data: { name: 'Test Company', subscriptionTier: 'basic', subscriptionStatus: 'active' },
  });

  const adminHash = await hashPassword(TEST_CREDENTIALS.adminPassword);
  const techHash = await hashPassword(TEST_CREDENTIALS.techPassword);

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      role: 'admin',
      name: 'Test Admin',
      email: TEST_CREDENTIALS.adminEmail,
      passwordHash: adminHash,
    },
  });

  const tech = await prisma.user.create({
    data: {
      companyId: company.id,
      role: 'technician',
      name: 'Test Tech',
      email: TEST_CREDENTIALS.techEmail,
      passwordHash: techHash,
    },
  });

  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Test Client',
      location: '123 Test St',
    },
  });

  const adminToken = generateToken({
    userId: admin.id,
    companyId: company.id,
    role: 'admin',
  });

  const techToken = generateToken({
    userId: tech.id,
    companyId: company.id,
    role: 'technician',
  });

  return { company, admin, tech, client, adminToken, techToken };
}

module.exports = { createTestData, TEST_CREDENTIALS };
