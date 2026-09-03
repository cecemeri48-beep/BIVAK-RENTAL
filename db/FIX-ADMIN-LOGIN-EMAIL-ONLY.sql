-- ============================================================
-- FIX ADMIN LOGIN BIVAK - Email Only
-- Admin: songkranveo@gmail.com, upik.zulkiflie@gmail.com
-- Jalankan di Supabase SQL Editor untuk memastikan email admin terdaftar
-- ============================================================

-- Pastikan kolom email ada
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email TEXT;

-- Jika tabel admins punya kolom id serial, pastikan email unik.
-- Jika gagal karena constraint sudah ada, aman diabaikan.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admins_email_unique'
      AND conrelid = 'public.admins'::regclass
  ) THEN
    ALTER TABLE public.admins ADD CONSTRAINT admins_email_unique UNIQUE (email);
  END IF;
END $$;

-- Masukkan / update email admin.
-- Mendukung 2 bentuk tabel admins:
-- 1) admins(user_id UUID PRIMARY KEY, email TEXT)
-- 2) admins(id SERIAL PRIMARY KEY, user_id UUID NULL, email TEXT)
INSERT INTO public.admins (user_id, email)
SELECT u.id, lower(u.email)
FROM auth.users u
WHERE lower(u.email) IN ('songkranveo@gmail.com', 'upik.zulkiflie@gmail.com')
ON CONFLICT DO NOTHING;

-- Fallback email-only jika user belum ada di auth.users dan tabel mengizinkan user_id NULL.
INSERT INTO public.admins (email)
VALUES ('songkranveo@gmail.com'), ('upik.zulkiflie@gmail.com')
ON CONFLICT DO NOTHING;

-- RLS: izinkan frontend anonymous membaca email admin untuk login email-only
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Read Admins" ON public.admins;
DROP POLICY IF EXISTS "Public Read Admins Email" ON public.admins;
DROP POLICY IF EXISTS "admins_select" ON public.admins;
CREATE POLICY "Public Read Admins Email"
ON public.admins FOR SELECT
TO anon, authenticated
USING (true);

-- RPC opsional untuk cek admin by email
CREATE OR REPLACE FUNCTION public.check_admin_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE lower(email) = lower(trim(p_email))
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.check_admin_email(TEXT) TO anon, authenticated;

-- Verifikasi
SELECT email, created_at FROM public.admins
WHERE lower(email) IN ('songkranveo@gmail.com', 'upik.zulkiflie@gmail.com')
ORDER BY email;
