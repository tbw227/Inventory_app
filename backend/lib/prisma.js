const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const log =
  process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
