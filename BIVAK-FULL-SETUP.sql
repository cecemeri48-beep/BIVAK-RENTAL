-- ============================================================
-- BIVAK v4 - FULL SETUP SCRIPT (Gabungan Schema + Migrasi)
-- ============================================================
-- CARA PAKAI: Copy seluruh code di bawah, paste ke Supabase SQL Editor, lalu Run.
-- Pastikan Auth service sudah aktif di Project Settings.
-- ============================================================

-- ==========================================================================
-- 1. TIPE DATA
-- (PostgreSQL tidak support `CREATE TYPE IF NOT EXISTS`)
-- ==========================================================================
DO $$ BEGIN
    CREATE TYPE public.vendor_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.donation_status_type AS ENUM ('baru', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ==========================================================================
-- 2. TABEL UTAMA
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.cities (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,
    region  VARCHAR(50)  DEFAULT 'Sulawesi Selatan'
);

CREATE TABLE IF NOT EXISTS public.vendors (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name           VARCHAR(150) NOT NULL,
    city           VARCHAR(100) NOT NULL,
    address        TEXT NOT NULL,
    phone          VARCHAR(30) NOT NULL,
    rating         NUMERIC(3,2) DEFAULT 5.0,
    reviews_count  INT DEFAULT 1,
    min_price      NUMERIC(12,2) NOT NULL DEFAULT 15000,
    gears          TEXT[] NOT NULL DEFAULT '{}',
    image_url      TEXT,
    is_verified    BOOLEAN DEFAULT false,
    status         vendor_status_type DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admins (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id             INT PRIMARY KEY DEFAULT 1,
    donation_base  NUMERIC(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT single_row CHECK (id = 1)
);

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
-- 3. RLS POLICIES
-- ==========================================================================

-- Vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendors_select_public" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select_admin"  ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert_admin"  ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_admin"  ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete_admin"  ON public.vendors;

CREATE POLICY "vendors_select_public" ON public.vendors FOR SELECT USING (status = 'approved');
CREATE POLICY "vendors_select_admin" ON public.vendors FOR ALL USING (true);
CREATE POLICY "vendors_insert_admin" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "vendors_update_admin" ON public.vendors FOR UPDATE USING (true);
CREATE POLICY "vendors_delete_admin" ON public.vendors FOR DELETE USING (true);

-- Donasi
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
  FOR SELECT USING (true);

CREATE POLICY "donasi_insert_public" ON public.donasi
  FOR INSERT WITH CHECK (astatus = 'baru');

CREATE POLICY "donasi_insert_admin" ON public.donasi
  FOR INSERT WITH CHECK (true);

CREATE POLICY "donasi_update_admin" ON public.donasi
  FOR UPDATE USING (true);

CREATE POLICY "donasi_delete_admin" ON public.donasi
  FOR DELETE USING (true);

-- Admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_select_admin" ON public.admins;
CREATE POLICY "admins_select_admin" ON public.admins
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.admins));


-- ==========================================================================
-- 4. HELPER FUNCTIONS
-- ==========================================================================

-- Fungsi cek admin
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

-- Fungsi update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ==========================================================================
-- 5. INDEKS
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors (status);
CREATE INDEX IF NOT EXISTS idx_vendors_city   ON public.vendors (city);
CREATE INDEX IF NOT EXISTS idx_donasi_status  ON public.donasi (astatus);
CREATE INDEX IF NOT EXISTS idx_donasi_created ON public.donasi (created_at DESC);


-- ==========================================================================
-- 6. SEED DATA — VENDORS (6 contoh vendor Sulawesi Selatan)
-- ==========================================================================
INSERT INTO public.vendors (name, city, address, phone, rating, reviews_count, min_price, gears, image_url, is_verified, status) VALUES
('Celebes Outdoor Rental Makassar', 'Makassar', 'Jl. Sultan Alauddin No. 88, Rappocini', '6281245678901', 4.9, 128, 15000, '{"Tenda Dome 4P","Carrier 75L","Sleeping Bag","Kompor Portable"}', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', true, 'approved'),
('Bawakaraeng Adventure Gowa', 'Gowa', 'Jl. Poros Malino Km. 12, Sungguminasa', '6285299887766', 4.8, 95, 12000, '{"Tenda 2-6P","Tracking Pole Carbon","Nesting Cookset","Lampu LED"}', 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800', true, 'approved'),
('Malino Highland Camp Gear', 'Malino', 'Jl. Endang No. 15, kawasan Wisata Malino', '6282188990011', 5.0, 74, 20000, '{"Tenda Family Luxury","Matras Thermal","Hammock Double","Grill Barbeque"}', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800', true, 'approved'),
('Rammang-Rammang Outdoor Maros', 'Maros', 'Jl. Poros Maros-Pangkep Km. 5, Salewangang', '6281355443322', 4.7, 62, 15000, '{"Tenda Glamping","Life Jacket","Kompor Ultralight","Headlamp"}', 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800', true, 'approved'),
('Toraja Highland Explorer', 'Toraja', 'Jl. Ahmad Yani No. 24, Rantepao', '6281142009988', 4.9, 110, 25000, '{"Sepatu Tracking","Jaket Windproof","Carrier 60L","GPS Navigation"}', 'https://images.unsplash.com/photo-1510368294256-2568b4f8e0a5?w=800', true, 'approved'),
('Palopo Camp & Trail Base', 'Palopo', 'Jl. Jendral Sudirman No. 102, Wara', '6285341122334', 4.6, 48, 15000, '{"Tenda Dome","Sleeping Bag","Kompor Mawar","Botol Tumbler"}', 'https://images.unsplash.com/photo-1449156493391-d2c828b1e316?w=800', true, 'approved');


-- ==========================================================================
-- 7. SEED DATA — CITIES
-- ==========================================================================
INSERT INTO public.cities (name, region) VALUES
('Makassar', 'Sulawesi Selatan'),
('Gowa', 'Sulawesi Selatan'),
('Maros', 'Sulawesi Selatan'),
('Bantaeng', 'Sulawesi Selatan'),
('Sinjai', 'Sulawesi Selatan'),
('Takalar', 'Sulawesi Selatan'),
('Jeneponto', 'Sulawesi Selatan'),
('Bulukumba', 'Sulawesi Selatan'),
('Selayar', 'Sulawesi Selatan'),
('Wajo', 'Sulawesi Selatan'),
('Soppeng', 'Sulawesi Selatan'),
('Pinrang', 'Sulawesi Selatan'),
('Polewali Mandar', 'Sulawesi Barat'),
('Palopo', 'Sulawesi Selatan'),
('Luwu', 'Sulawesi Selatan'),
('Luwu Utara', 'Sulawesi Selatan'),
('Luwu Timur', 'Sulawesi Selatan'),
('Tana Toraja', 'Sulawesi Selatan'),
('Toraja Utara', 'Sulawesi Selatan'),
('Enrekang', 'Sulawesi Selatan'),
('Mamuju', 'Sulawesi Barat'),
('Mamasa', 'Sulawesi Barat');


-- ==========================================================================
-- 8. SEED DATA — DONASI (15 donor Bawakaraeng)
-- ==========================================================================
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


-- ==========================================================================
-- 9. SITE SETTINGS
-- ==========================================================================
INSERT INTO public.site_settings (id, donation_base)
VALUES (1, 47500000)
ON CONFLICT (id) DO UPDATE SET donation_base = EXCLUDED.donation_base;


-- ==========================================================================
-- 10. ADMIN SETUP — GANTI EMAIL DI BAWAH INI
-- ==========================================================================
-- Step A: Cari user_id dari email yang sudah terdaftar di auth.users
-- SELECT id, email FROM auth.users WHERE email LIKE '%cecemeri%';
--
-- Step B: Masukkan ke tabel admins (ganti UUID dengan hasil query di atas)
-- Contoh:
-- INSERT INTO public.admins (user_id, email)
-- VALUES ('aaaa-bbbb-cccc-dddd-eeee', 'email@contoh.com');
--
-- ATAU gunakan query otomatis ini (pastikan email sudah diverifikasi di Auth):
-- INSERT INTO public.admins (user_id, email)
-- SELECT id, email
-- FROM auth.users
-- WHERE email = 'EMAIL-ADMIN-KAMU@CONTOH.COM'
-- ON CONFLICT (user_id) DO NOTHING;


-- ==========================================================================
-- VERIFIKASI
-- ==========================================================================
SELECT count(*) AS "Total Vendors" FROM public.vendors;
SELECT count(*) AS "Total Donasi" FROM public.donasi;
SELECT count(*) AS "Total Admins" FROM public.admins;
SELECT * FROM public.donasi ORDER BY created_at DESC LIMIT 5;
