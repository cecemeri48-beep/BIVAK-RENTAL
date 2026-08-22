-- ============================================================
-- BIVAK v4 MIGRATION: Lelang → Donasi Pintu Angin
-- ============================================================
-- Jalankan blok per blok di Supabase SQL Editor.
-- Transisi: hapus sistem lelang lama, ganti dengan donasi
-- yang terhubung ke database Pintu Angin Bawakaraeng.
-- ============================================================


-- ==========================================================================
-- BLOK 1. HAPUS FUNGSI & TABEL LELANG LAMA
-- ==========================================================================
DROP FUNCTION IF EXISTS public.place_bid(UUID, TEXT, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.total_donation_raised() CASCADE;

DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.auction_items CASCADE;
DROP TYPE IF EXISTS auction_status_type CASCADE;


-- ==========================================================================
-- BLOK 2. TABEL DONASI (sinkron Pintu Angin Bawakaraeng)
-- ==========================================================================
DO $$ BEGIN
    CREATE TYPE donation_status_type AS ENUM ('baru', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.donasi (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        TEXT        NOT NULL,
    email       TEXT        NOT NULL DEFAULT '',
    amt         BIGINT      NOT NULL DEFAULT 0,
    source      TEXT        NOT NULL DEFAULT 'bivak',
    astatus     donation_status_type NOT NULL DEFAULT 'baru',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ==========================================================================
-- BLOK 3. HELPER FUNGSI ADMIN
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$fn$;

GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;


-- ==========================================================================
-- BLOK 4. ROW LEVEL SECURITY
-- ==========================================================================
ALTER TABLE public.donasi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donasi_select_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_select_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_update_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_delete_admin"  ON public.donasi;

CREATE POLICY "donasi_select_public" ON public.donasi
  FOR SELECT USING (astatus = 'disetujui');

CREATE POLICY "donasi_select_admin" ON public.donasi
  FOR SELECT USING (public.is_app_admin());

CREATE POLICY "donasi_insert_public" ON public.donasi
  FOR INSERT WITH CHECK (astatus = 'baru');

CREATE POLICY "donasi_insert_admin" ON public.donasi
  FOR INSERT WITH CHECK (public.is_app_admin());

CREATE POLICY "donasi_update_admin" ON public.donasi
  FOR UPDATE USING (public.is_app_admin());

CREATE POLICY "donasi_delete_admin" ON public.donasi
  FOR DELETE USING (public.is_app_admin());


-- ==========================================================================
-- BLOK 5. INDEKS
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_donasi_status  ON public.donasi (astatus);
CREATE INDEX IF NOT EXISTS idx_donasi_created ON public.donasi (created_at DESC);


-- ==========================================================================
-- BLOK 6. SEED DATA DONASI (opsional)
-- ==========================================================================
INSERT INTO public.donasi (nama, email, amt, astatus) VALUES
('Andi Mappanyukki',       'andi@example.com', 10000000, 'disetujui'),
('Komunitas Pencinta Alam Makassar', '', 7500000,  'disetujui'),
('Nurul Fadhilah',         'nurul@example.com', 5000000,  'disetujui'),
('Baso Dg. Nassa',         '',                  5000000,  'disetujui'),
('Rina Kartika',           'rina@example.com',  3500000,  'disetujui');


-- ==========================================================================
-- BLOK 7. VERIFIKASI
-- ==========================================================================
-- SELECT count(*) FROM public.donasi;
-- SELECT * FROM public.donasi ORDER BY created_at DESC;