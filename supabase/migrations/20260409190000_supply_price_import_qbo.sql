-- Mirror backend/prisma/migrations/20260409190000_supply_price_import_qbo/migration.sql
CREATE TYPE "SupplyImportJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "SupplyImportJobType" AS ENUM ('csv_supply');
CREATE TYPE "SupplyImportRowStatus" AS ENUM ('pending', 'success', 'error');

ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(12,2);

CREATE TABLE IF NOT EXISTS "supply_import_jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_by_user_id" UUID,
    "type" "SupplyImportJobType" NOT NULL,
    "status" "SupplyImportJobStatus" NOT NULL DEFAULT 'pending',
    "file_name" VARCHAR(255),
    "result" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supply_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supply_import_rows" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "row_index" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SupplyImportRowStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supply_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quickbooks_connections" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "realm_id" VARCHAR(64) NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "access_token_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quickbooks_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supply_import_jobs_company_id_idx" ON "supply_import_jobs"("company_id");
CREATE INDEX IF NOT EXISTS "supply_import_rows_job_id_idx" ON "supply_import_rows"("job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quickbooks_connections_company_id_key" ON "quickbooks_connections"("company_id");

ALTER TABLE "supply_import_jobs" DROP CONSTRAINT IF EXISTS "supply_import_jobs_company_id_fkey";
ALTER TABLE "supply_import_jobs" ADD CONSTRAINT "supply_import_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supply_import_rows" DROP CONSTRAINT IF EXISTS "supply_import_rows_job_id_fkey";
ALTER TABLE "supply_import_rows" ADD CONSTRAINT "supply_import_rows_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "supply_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quickbooks_connections" DROP CONSTRAINT IF EXISTS "quickbooks_connections_company_id_fkey";
ALTER TABLE "quickbooks_connections" ADD CONSTRAINT "quickbooks_connections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
