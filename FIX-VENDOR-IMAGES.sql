-- BIVAK: penyimpanan logo dan kolase vendor
-- Jalankan di project Supabase: pledqkanjduhabruvgxx

BEGIN;

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS collage_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-images',
  'vendor-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public upload vendor images" ON storage.objects;
DROP POLICY IF EXISTS "Public read vendor images" ON storage.objects;

CREATE POLICY "Public upload vendor images"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'vendor-images');

CREATE POLICY "Public read vendor images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'vendor-images');

COMMIT;
