-- ============================================================
-- BIVAK Admin Email-Only Setup
-- Database: sqxwhfdarnzypicoamzl
-- ============================================================

-- BLOK 1: Tabel admins
CREATE TABLE IF NOT EXISTS public.admins (
    id         SERIAL PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tambah UNIQUE constraint dengan nama eksplisit agar ON CONFLICT bisa bekerja
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admins_email_unique'
    ) THEN
        ALTER TABLE public.admins ADD CONSTRAINT admins_email_unique UNIQUE (email);
    END IF;
END $$;

-- BLOK 2: RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select" ON public.admins;
CREATE POLICY "admins_select" ON public.admins
    FOR SELECT TO anon, authenticated USING (true);

-- BLOK 3: Fungsi RPC cek admin
CREATE OR REPLACE FUNCTION public.check_admin_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins
        WHERE LOWER(email) = LOWER(p_email)
    );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.check_admin_email(TEXT) TO anon, authenticated;

-- BLOK 4: Grant akses
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- BLOK 5: Masukkan admin (pakai constraint name)
INSERT INTO public.admins (email)
VALUES ('cemeri48@gmail.com')
ON CONFLICT ON CONSTRAINT admins_email_unique DO NOTHING;

INSERT INTO public.admins (email)
VALUES ('upik.zulkiflie@gmail.com')
ON CONFLICT ON CONSTRAINT admins_email_unique DO NOTHING;

-- Verifikasi
SELECT email, created_at FROM public.admins ORDER BY created_at DESC;
