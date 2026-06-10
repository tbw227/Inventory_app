-- Mirror of Prisma migration 20260610220000_add_audit_events

DO $$ BEGIN
  CREATE TYPE "AuditActorType" AS ENUM ('human', 'agent', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "audit_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "principal_user_id" UUID,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_events_company_created_idx" ON "audit_events"("company_id", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
