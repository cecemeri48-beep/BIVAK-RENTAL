-- ============================================================
-- SETUP DONASI BIVAK - LANGSUNG JALAN
-- Copy paste ke Supabase SQL Editor → Run
-- ============================================================

-- 1. Buat TYPE ENUM (jika belum ada)
DO $$ BEGIN
    CREATE TYPE public.donation_status_type AS ENUM ('baru', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Buat Tabel Donasi
CREATE TABLE IF NOT EXISTS public.donasi (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        TEXT        NOT NULL,
    email       TEXT        NOT NULL DEFAULT '',
    amt         BIGINT      NOT NULL DEFAULT 0,
    source      TEXT        NOT NULL DEFAULT 'bivak',
    astatus     donation_status_type NOT NULL DEFAULT 'baru',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.donasi ENABLE ROW LEVEL SECURITY;

-- 4. Drop semua policy lama
DROP POLICY IF EXISTS "donasi_select_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_select_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_update_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_delete_admin"  ON public.donasi;

-- 5. Buat Policy Baru
-- Public bisa SELECT hanya yang disetujui
CREATE POLICY "donasi_select_public" ON public.donasi
    FOR SELECT USING (astatus = 'disetujui');

-- Admin bisa SELARAS semua data
CREATE POLICY "donasi_select_admin" ON public.donasi
    FOR ALL USING (true);

-- Public bisa INSERT donasi baru
CREATE POLICY "donasi_insert_public" ON public.donasi
    FOR INSERT WITH CHECK (astatus = 'baru');

-- Admin bisa UPDATE dan DELETE
CREATE POLICY "donasi_update_admin" ON public.donasi
    FOR ALL USING (true);

-- 6. Buat Index
CREATE INDEX IF NOT EXISTS idx_donasi_status  ON public.donasi (astatus);
CREATE INDEX IF NOT EXISTS idx_donasi_created ON public.donasi (created_at DESC);

-- 7. Seed Data Contoh (15 donor)
INSERT INTO public.donasi (nama, email, amt, source, astatus) VALUES
('Andi Mappanyukki',              'andi@example.com', 10000000, 'bivak', 'disetujui'),
('Komunitas Pencinta Alam Makassar', '', 7500000, 'bivak', 'disetujui'),
('Nurul Fadhilah',                'nurul@example.com', 5000000, 'bivak', 'disetujui'),
('Baso Dg. Nassa',                '', 5000000, 'bivak', 'disetujui'),
('Rina Kartika',                  'rina@example.com', 3500000, 'bivak', 'disetujui'),
('Alumni Rimba 45',               '', 3000000, 'bivak', 'disetujui'),
('Muh. Ilham',                    '', 2500000, 'bivak', 'disetujui'),
('Sitti Aminah',                  '', 2500000, 'bivak', 'disetujui'),
('Yusuf Pratama',                 '', 2000000, 'bivak', 'disetujui'),
('Andi Dg. Tata',                 '', 1500000, 'bivak', 'disetujui'),
('Hasan Basri',                   '', 1500000, 'bivak', 'disetujui'),
('Wahyuni',                       '', 1000000, 'bivak', 'disetujui'),
('Fajar Nugraha',                 '', 1000000, 'bivak', 'disetujui'),
('Hamba Lestari',                 '', 1000000, 'bivak', 'disetujui'),
('Reza Maulana',                  '', 500000, 'bivak', 'disetujui');

-- 8. Verifikasi
SELECT count(*) AS "Total Donasi" FROM public.donasi;
SELECT * FROM public.donasi ORDER BY created_at DESC LIMIT 5;
