-- Block Supabase PostgREST (anon / authenticated) from app tables by default.
-- Express + Prisma use the postgres role, which bypasses RLS — API behavior unchanged.
-- Add explicit RLS policies later only if you adopt Supabase Auth or browser Data API access.

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supply_import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supply_import_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quickbooks_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
