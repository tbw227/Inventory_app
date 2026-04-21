-- Spreadsheet-style catalog + tier pricing columns
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "catalog_group" VARCHAR(120);
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "qty_per_unit" VARCHAR(80);
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "case_qty" INTEGER;
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "min_order_qty" INTEGER;
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "min_order_unit_price" DECIMAL(12,2);
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "discount_r_qty" INTEGER;
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "discount_r_unit_price" DECIMAL(12,2);
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "discount_n_qty" INTEGER;
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "discount_n_unit_price" DECIMAL(12,2);

CREATE INDEX IF NOT EXISTS "supplies_company_catalog_group_idx" ON "supplies"("company_id", "catalog_group");
