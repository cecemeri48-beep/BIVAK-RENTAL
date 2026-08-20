-- ============================================================
-- BIVAK Admin Email-Only Setup
-- Database: sqxwhfdarnzypicoamzl
-- ============================================================
-- CARA PAKAI:
-- 1. Jalankan blok 1-5 di SQL Editor Supabase
-- 2. Jalankan blok 6 untuk memasukkan admin Anda
-- 3. Selesai! Admin tinggal masukkan email, langsung masuk.
-- ============================================================

-- ============================================================
-- BLOK 1: Tabel admins (jika belum ada)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admins (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================
-- BLOK 2: RLS untuk admins
-- ============================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins any select" ON public.admins;
CREATE POLICY "Admins any select" ON public.admins
    FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- BLOK 3: Fungsi RPC untuk cek admin berdasarkan email
-- ============================================================
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

-- ============================================================
-- BLOK 4: Grant akses ke tabel lain
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- BLOK 5: Verifikasi tabel ada
-- ============================================================
SELECT 
    'admins' AS table_name, 
    count(*) AS rows 
FROM public.admins
UNION ALL
SELECT 
    'vendors' AS table_name, 
    count(*) AS rows 
FROM public.vendors
UNION ALL
SELECT 
    'cities' AS table_name, 
    count(*) AS rows 
FROM public.cities;

-- ============================================================
-- BLOK 6: MASUKKAN ADMIN ANDA DI SINI
-- ============================================================
-- Ganti email di bawah dengan email yang ingin dijadikan admin
-- Tidak perlu user_id — sistem akan otomatis cocokkan

-- Admin 1
INSERT INTO public.admins (email)
VALUES ('cemeri48@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Admin 2
INSERT INTO public.admins (email)
VALUES ('upik.zulkiflie@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Verifikasi
SELECT email, created_at FROM public.admins ORDER BY created_at DESC;
