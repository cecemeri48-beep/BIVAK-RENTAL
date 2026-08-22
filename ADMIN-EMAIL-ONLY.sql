-- ============================================================
-- BIVAK Admin Email-Only Setup
-- Database: sqxwhfdarnzypicoamzl
-- CARA PAKAI: Copy semua SQL di bawah, paste ke SQL Editor, Run
-- ============================================================

-- 1. Hapus tabel lama (jika ada) agar bisa buat ulang fresh
DROP TABLE IF EXISTS public.admins CASCADE;

-- 2. Buat tabel baru
CREATE TABLE public.admins (
    id         SERIAL PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tambah UNIQUE constraint pada email
ALTER TABLE public.admins ADD CONSTRAINT admins_email_unique UNIQUE (email);

-- 4. Aktifkan RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 5. Buat policy agar admin bisa dibaca
DROP POLICY IF EXISTS "admins_select" ON public.admins;
CREATE POLICY "admins_select" ON public.admins
    FOR SELECT TO anon, authenticated USING (true);

-- 6. Fungsi RPC untuk cek admin berdasarkan email
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

-- 7. Grant akses ke semua tabel & sequence
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 8. Masukkan admin
INSERT INTO public.admins (email)
VALUES ('cemeri48@gmail.com')
ON CONFLICT ON CONSTRAINT admins_email_unique DO NOTHING;

INSERT INTO public.admins (email)
VALUES ('upik.zulkiflie@gmail.com')
ON CONFLICT ON CONSTRAINT admins_email_unique DO NOTHING;

-- 9. Verifikasi
SELECT id, email, created_at FROM public.admins ORDER BY created_at DESC;
