ALTER TABLE supplies ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'General';
CREATE INDEX IF NOT EXISTS supplies_company_category_idx ON supplies(company_id, category);
