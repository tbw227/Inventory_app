const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = require('../lib/prisma');

async function connectDB() {
  if (!process.env.DATABASE_URL || !String(process.env.DATABASE_URL).trim()) {
    throw new Error(
      'DATABASE_URL is required. Use Supabase (Project Settings → Database) or local Postgres, e.g. postgresql://postgres:postgres@127.0.0.1:5432/firetrack'
    );
  }
  await prisma.$connect();
  console.log('PostgreSQL connected (Prisma)');

  try {
    const row = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS ok
    `;
    if (row?.[0]?.ok !== true) {
      console.warn(
        '[db] Table public.users not found. Apply schema: cd backend && npx prisma migrate deploy (then optional: npm run seed)'
      );
    }
  } catch {
    /* ignore probe errors */
  }
}

async function disconnectDB() {
  await prisma.$disconnect();
}

connectDB.disconnect = disconnectDB;
/** @deprecated use connectDB.disconnect */
connectDB.stopDevMemoryServer = disconnectDB;

module.exports = connectDB;
