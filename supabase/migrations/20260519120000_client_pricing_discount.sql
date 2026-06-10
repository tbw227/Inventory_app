-- Mirror of backend/prisma/migrations/20260519120000_client_pricing_discount/migration.sql

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "pricing_discount_percent" INTEGER,
ADD COLUMN "pricing_discount_notes" VARCHAR(500);
