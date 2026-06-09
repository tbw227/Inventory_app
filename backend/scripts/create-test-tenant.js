/**
 * Create a disposable tenant for end-to-end test runs (empty shop catalog).
 *
 * Usage: node scripts/create-test-tenant.js
 * Skips if test@fieldopsbeta.com already exists.
 */
require('../loadEnv');

const connectDB = require('../db');
const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/auth');

const EMAIL = 'test@fieldopsbeta.com';
const PASSWORD = 'TestRun2026!';
const COMPANY = 'FieldOps Test Co';
const NAME = 'Test Admin';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`Test tenant already exists: ${EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: COMPANY } });
    await tx.user.create({
      data: {
        companyId: company.id,
        role: 'admin',
        name: NAME,
        email: EMAIL,
        passwordHash,
      },
    });
  });

  console.log('Test tenant created:');
  console.log(`  Company:  ${COMPANY}`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
}

connectDB()
  .then(main)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  });
