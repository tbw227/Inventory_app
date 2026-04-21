CREATE INDEX IF NOT EXISTS jobs_company_assigned_date_idx
ON jobs (company_id, assigned_user_id, scheduled_date);
