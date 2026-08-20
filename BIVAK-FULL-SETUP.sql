-- =====================================
-- BIVAK v5 FULL SETUP (Database sqxwhfdarnzypicoamzl)
-- ======================================

-- Tipe data
DO $$ BEGIN
    CREATE TYPE public.vendor_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabel utama
CREATE TABLE IF NOT EXISTS public.cities (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(100) NOT NULL UNIQUE,
    region VARCHAR(50) DEFAULT 'Sulawesi Selatan'
);

CREATE TABLE IF NOT EXISTS public.vendors (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name          VARCHAR(150) NOT NULL,
    city          VARCHAR(100) NOT NULL,
    address       TEXT NOT NULL,
    phone         VARCHAR(30) NOT NULL,
    rating        NUMERIC(3,2) DEFAULT 5.0,
    reviews_count INT DEFAULT 1,
    min_price     NUMERIC(12,2) NOT NULL DEFAULT 15000,
    gears         TEXT[] NOT NULL DEFAULT '{}',
    image_url     TEXT,
    is_verified   BOOLEAN DEFAULT false,
    status        vendor_status_type DEFAULT 'pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admins (
    id         SERIAL PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON public.admins (email);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id            INT PRIMARY KEY DEFAULT 1,
    donation_base NUMERIC(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT single_row CHECK (id = 1)
);

-- ============================================================
-- RLS Policies — gunakan DROP IF EXISTS agar aman di-rerun
-- ============================================================
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cities_select_public" ON public.cities;
CREATE POLICY "cities_select_public" ON public.cities FOR SELECT USING (true);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendors_select_public" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select_admin"  ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert_admin"  ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_admin"  ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete_admin"  ON public.vendors;
CREATE POLICY "vendors_select_public" ON public.vendors FOR SELECT USING (status = 'approved');
CREATE POLICY "vendors_select_admin"  ON public.vendors FOR ALL USING (true);
CREATE POLICY "vendors_insert_admin"  ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "vendors_update_admin"  ON public.vendors FOR UPDATE USING (true);
CREATE POLICY "vendors_delete_admin"  ON public.vendors FOR DELETE USING (true);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_select_public" ON public.admins;
CREATE POLICY "admins_select_public" ON public.admins FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select_public" ON public.site_settings;
CREATE POLICY "settings_select_public" ON public.site_settings FOR SELECT USING (true);

-- Fungsi cek admin
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

-- Seed data
INSERT INTO public.cities (name) VALUES
    ('Makassar'),('Gowa'),('Maros'),('Palopo'),('Toraja'),
    ('Bantaeng'),('Sinjai'),('Takalar'),('Jeneponto'),('Bulukumba'),
    ('Selayar'),('Wajo'),('Soppeng'),('Pinrang'),('Enrekang')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.vendors (name, city, address, phone, rating, reviews_count, min_price, gears, image_url, is_verified, status) VALUES
    ('Celebes Outdoor Rental Makassar','Makassar','Jl. Sultan Alauddin No. 88, Rappocini','6281245678901',4.9,128,15000,'{Tenda Dome 4P,Carrier 75L,Sleeping Bag,Kompor Portable}','https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',true,'approved'),
    ('Bawakaraeng Adventure Gowa','Gowa','Jl. Poros Malino Km. 12, Sungguminasa','6285299887766',4.8,95,12000,'{Tenda 2-6P,Tracking Pole Carbon,Nesting Cookset,Lampu LED}','https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800',true,'approved'),
    ('Malino Highland Camp Gear','Malino','Jl. Endang No. 15, kawasan Wisata Malino','6282188990011',5.0,74,20000,'{Tenda Family Luxury,Matras Thermal,Hammock Double,Grill Barbeque}','https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800',true,'approved'),
    ('Rammang-Rammang Outdoor Maros','Maros','Jl. Poros Maros-Pangkep Km. 5, Salewangang','6281355443322',4.7,62,15000,'{Tenda Glamping,Life Jacket,Kompor Ultralight,Headlamp}','https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800',true,'approved'),
    ('Toraja Highland Explorer','Toraja','Jl. Ahmad Yani No. 24, Rantepao','6281142009988',4.9,110,25000,'{Sepatu Tracking,Jaket Windproof,Carrier 60L,GPS Navigation}','https://images.unsplash.com/photo-1510368294256-2568b4f8e0a5?w=800',true,'approved'),
    ('Palopo Camp & Trail Base','Palopo','Jl. Jendral Sudirman No. 102, Wara','6285341122334',4.6,48,15000,'{Tenda Dome,Sleeping Bag,Kompor Mawar,Botol Tumbler}','https://images.unsplash.com/photo-1449156493391-d2c828b1e316?w=800',true,'approved');

INSERT INTO public.admins (email) VALUES
    ('cemeri48@gmail.com'),
    ('upik.zulkiflie@gmail.com')
ON CONFLICT ON CONSTRAINT idx_admins_email DO NOTHING;

-- Verifikasi
SELECT 'admins'   AS tbl, count(*) FROM public.admins
UNION ALL SELECT 'vendors', count(*) FROM public.vendors
UNION ALL SELECT 'cities',  count(*) FROM public.cities;
