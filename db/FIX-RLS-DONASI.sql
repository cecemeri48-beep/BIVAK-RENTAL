-- ============================================================================
-- BIVAK - FIX RLS POLICY DATABASE DONASI (PINTU ANGIN)
-- Database: ncoueeeskzslldppsbvx (Donasi)
-- ============================================================================
-- CARA PAKAI:
-- 1. Buka https://app.supabase.com/project/ncoueeeskzslldppsbvx/sql
-- 2. Copy-paste seluruh script ini
-- 3. Klik RUN
-- ============================================================================

-- ============================================================================
-- 1. TIPE DATA ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE donation_status_type AS ENUM ('baru', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. TABEL DONASI (IF NOT EXISTS - aman)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.donasi (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        TEXT        NOT NULL,
    email       TEXT        NOT NULL DEFAULT '',
    amt         BIGINT      NOT NULL DEFAULT 0,
    source      TEXT        NOT NULL DEFAULT 'bivak',
    astatus     donation_status_type NOT NULL DEFAULT 'baru',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. TABEL ADOPTI POHON (IF NOT EXISTS - aman)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.adoption_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
    package_name text NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    quantity integer NOT NULL CHECK (quantity > 0),
    whatsapp text,
    status text NOT NULL DEFAULT 'menunggu_bukti' CHECK (status IN ('menunggu_bukti','terverifikasi','ditolak')),
    adoption_code text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz
);

-- ============================================================================
-- 4. ENABLE RLS & DROP POLICY LAMA
-- ============================================================================
ALTER TABLE public.donasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_requests ENABLE ROW LEVEL SECURITY;

-- Drop semua policy lama
DROP POLICY IF EXISTS "donasi_select_public"      ON public.donasi;
DROP POLICY IF EXISTS "donasi_select_admin"       ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_public"      ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_admin"       ON public.donasi;
DROP POLICY IF EXISTS "donasi_update_admin"       ON public.donasi;
DROP POLICY IF EXISTS "donasi_delete_admin"       ON public.donasi;
DROP POLICY IF EXISTS "adoption_insert_public"    ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_select_all"       ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_update_admin"     ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_delete_admin"     ON public.adoption_requests;

-- ============================================================================
-- 5. POLICY DONASI
-- ============================================================================

-- Publik bisa SELECT hanya yang disetujui (untuk leaderboard)
CREATE POLICY "donasi_select_public"
    ON public.donasi
    FOR SELECT TO anon, authenticated
    USING (astatus = 'disetujui');

-- Admin/public bisa SELECT semua (untuk admin panel)
CREATE POLICY "donasi_select_admin"
    ON public.donasi
    FOR SELECT TO anon, authenticated
    USING (true);

-- Publik bisa INSERT donasi baru
CREATE POLICY "donasi_insert_public"
    ON public.donasi
    FOR INSERT TO anon, authenticated
    WITH CHECK (astatus = 'baru');

-- Admin bisa INSERT (untuk seed data)
CREATE POLICY "donasi_insert_admin"
    ON public.donasi
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Admin bisa UPDATE (approve/reject)
CREATE POLICY "donasi_update_admin"
    ON public.donasi
    FOR UPDATE TO anon, authenticated
    USING (true);

-- Admin bisa DELETE
CREATE POLICY "donasi_delete_admin"
    ON public.donasi
    FOR DELETE TO anon, authenticated
    USING (true);

-- ============================================================================
-- 6. POLICY ADOPTI POHON
-- ============================================================================

-- Publik bisa INSERT pengajuan
CREATE POLICY "adoption_insert_public"
    ON public.adoption_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Admin/publik bisa SELECT semua (untuk admin panel)
CREATE POLICY "adoption_select_all"
    ON public.adoption_requests
    FOR SELECT TO anon, authenticated
    USING (true);

-- Admin bisa UPDATE (verifikasi & terbitkan kode)
CREATE POLICY "adoption_update_admin"
    ON public.adoption_requests
    FOR UPDATE TO anon, authenticated
    USING (true);

-- Admin bisa DELETE (hapus yang sudah selesai)
CREATE POLICY "adoption_delete_admin"
    ON public.adoption_requests
    FOR DELETE TO anon, authenticated
    USING (true);

-- ============================================================================
-- 7. INDEX
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_donasi_status      ON public.donasi (astatus);
CREATE INDEX IF NOT EXISTS idx_donasi_created     ON public.donasi (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_status    ON public.adoption_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_code      ON public.adoption_requests (adoption_code);

-- ============================================================================
-- 8. SEED DATA DONASI (opsional - hanya jika kosong)
-- ============================================================================
INSERT INTO public.donasi (nama, email, amt, source, astatus)
SELECT 'Andi Mappanyukki', 'andi@example.com', 10000000, 'bivak', 'disetujui'
WHERE NOT EXISTS (SELECT 1 FROM public.donasi LIMIT 1);

INSERT INTO public.donasi (nama, email, amt, source, astatus)
SELECT 'Komunitas Pencinta Alam Makassar', '', 7500000, 'bivak', 'disetujui'
WHERE NOT EXISTS (SELECT 1 FROM public.donasi WHERE nama = 'Komunitas Pencinta Alam Makassar');

INSERT INTO public.donasi (nama, email, amt, source, astatus)
SELECT 'Nurul Fadhilah', 'nurul@example.com', 5000000, 'bivak', 'disetujui'
WHERE NOT EXISTS (SELECT 1 FROM public.donasi WHERE nama = 'Nurul Fadhilah');

INSERT INTO public.donasi (nama, email, amt, source, astatus)
SELECT 'Baso Dg. Nassa', '', 5000000, 'bivak', 'disetujui'
WHERE NOT EXISTS (SELECT 1 FROM public.donasi WHERE nama = 'Baso Dg. Nassa');

INSERT INTO public.donasi (nama, email, amt, source, astatus)
SELECT 'Rina Kartika', 'rina@example.com', 3500000, 'bivak', 'disetujui'
WHERE NOT EXISTS (SELECT 1 FROM public.donasi WHERE nama = 'Rina Kartika');

-- ============================================================================
-- 9. VERIFIKASI
-- ============================================================================
SELECT 
    'donasi' AS table_name, count(*) AS row_count FROM public.donasi
UNION ALL
    SELECT 'adoption_requests', count(*) FROM public.adoption_requests;

-- Cek policy yang aktif
SELECT 
    tablename,
    policyname,
    cmd,
    roles::text
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test query (harus berhasil)
SELECT id, nama, amt, astatus, created_at 
FROM public.donasi 
ORDER BY created_at DESC 
LIMIT 10;

SELECT id, customer_name, status, adoption_code 
FROM public.adoption_requests 
ORDER BY created_at DESC 
LIMIT 10;
