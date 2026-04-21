const prisma = require('../lib/prisma');
const { hashPassword, generateToken } = require('../utils/auth');

async function createTestData() {
  const company = await prisma.company.create({
    data: { name: 'Test Company', subscriptionTier: 'basic', subscriptionStatus: 'active' },
  });

  const adminHash = await hashPassword('TestAdmin1!');
  const techHash = await hashPassword('TestTech1!');

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      role: 'admin',
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash: adminHash,
    },
  });

  const tech = await prisma.user.create({
    data: {
      companyId: company.id,
      role: 'technician',
      name: 'Test Tech',
      email: 'tech@test.com',
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

module.exports = { createTestData };
