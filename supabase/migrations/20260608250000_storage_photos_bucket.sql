-- Private bucket for tenant-scoped job/profile photos ({company_id}/{filename}.webp).
-- The API uploads with the service role; browser access stays via authenticated Express routes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  10485760,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;
