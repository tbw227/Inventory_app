require('../loadEnv');
const prisma = require('../lib/prisma');

process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters';
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error(
      'DATABASE_URL and DIRECT_URL are required for tests (local: set both to the same test DB URL). Run: npx prisma migrate deploy'
    );
  }
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Truncate tenant root; CASCADE clears all FK-linked rows (including supply_import_*, quickbooks_*, etc.).
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE companies RESTART IDENTITY CASCADE;'
  );
});

module.exports = { prisma };
