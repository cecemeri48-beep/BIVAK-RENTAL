-- ============================================================
-- SETUP ADMIN LOGIN DENGAN PASSWORD (Supabase Auth)
-- Admin: songkranveo@gmail.com, upik.zulkiflie@gmail.com
-- ============================================================

-- PENTING:
-- Password dibuat di Supabase Dashboard > Authentication > Users.
-- Buat user untuk kedua email ini dan isi password di dashboard.
-- SQL ini hanya menyiapkan tabel admins + policy.

CREATE TABLE IF NOT EXISTS public.admins (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- Isi/update admin jika user Auth sudah dibuat.
INSERT INTO public.admins (user_id, email)
SELECT u.id, lower(u.email)
FROM auth.users u
WHERE lower(u.email) IN ('songkranveo@gmail.com', 'upik.zulkiflie@gmail.com')
ON CONFLICT ON CONSTRAINT admins_email_unique
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email;

-- Fallback: simpan email walaupun user Auth belum dibuat.
INSERT INTO public.admins (email)
VALUES ('songkranveo@gmail.com'), ('upik.zulkiflie@gmail.com')
ON CONFLICT ON CONSTRAINT admins_email_unique DO NOTHING;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Read Admins" ON public.admins;
DROP POLICY IF EXISTS "Public Read Admins Email" ON public.admins;
DROP POLICY IF EXISTS "admins_select" ON public.admins;
CREATE POLICY "Public Read Admins Email"
ON public.admins
FOR SELECT
TO anon, authenticated
USING (true);

-- Optional RPC untuk cek admin.
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

SELECT email, user_id, created_at
FROM public.admins
WHERE lower(email) IN ('songkranveo@gmail.com', 'upik.zulkiflie@gmail.com')
ORDER BY email;
