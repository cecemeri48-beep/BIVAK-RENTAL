-- ============================================================================
-- BIVAK - FIX RLS POLICY DATABASE UTAMA
-- Database: sqxwhfdarnzypicoamzl (Main)
-- ============================================================================
-- CARA PAKAI:
-- 1. Buka https://app.supabase.com/project/sqxwhfdarnzypicoamzl/sql
-- 2. Copy-paste seluruh script ini
-- 3. Klik RUN
-- ============================================================================

-- ============================================================================
-- 1. TIPE DATA (aman dijalankan ulang)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE vendor_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE auction_status_type AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. TABEL UTAMA (IF NOT EXISTS - aman)
-- ============================================================================
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
    created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.auction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200) NOT NULL,
    donor_name      VARCHAR(150) NOT NULL,
    donor_phone     VARCHAR(30) NOT NULL,
    cause_category  VARCHAR(100) NOT NULL,
    starting_bid    NUMERIC(12,2) NOT NULL DEFAULT 100000,
    current_bid     NUMERIC(12,2) NOT NULL DEFAULT 100000,
    highest_bidder  VARCHAR(150) DEFAULT 'Belum ada',
    bids_count      INT DEFAULT 0,
    end_time        TIMESTAMPTZ NOT NULL,
    image_url       TEXT,
    description     TEXT,
    status          auction_status_type DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.bids (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id    UUID REFERENCES public.auction_items(id) ON DELETE CASCADE,
    bidder_name   VARCHAR(150) NOT NULL,
    bidder_phone  VARCHAR(30) NOT NULL,
    bid_amount    NUMERIC(12,2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.admins (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id             INT PRIMARY KEY DEFAULT 1,
    donation_base  NUMERIC(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT single_row CHECK (id = 1)
);

-- ============================================================================
-- 3. ENABLE RLS & DROP POLICY LAMA
-- ============================================================================
ALTER TABLE public.cities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Drop semua policy lama
DROP POLICY IF EXISTS "Public Read Cities"           ON public.cities;
DROP POLICY IF EXISTS "Public Read Approved Vendors" ON public.vendors;
DROP POLICY IF EXISTS "Public Insert Vendor Request" ON public.vendors;
DROP POLICY IF EXISTS "Admin All Access Vendors"     ON public.vendors;
DROP POLICY IF EXISTS "Public Read Auctions"         ON public.auction_items;
DROP POLICY IF EXISTS "Public Insert Auction"        ON public.auction_items;
DROP POLICY IF EXISTS "Admin All Access Auctions"    ON public.auction_items;
DROP POLICY IF EXISTS "Admin Read Bids"              ON public.bids;
DROP POLICY IF EXISTS "Public Read Admins Email"     ON public.admins;
DROP POLICY IF EXISTS "Public Read Settings"         ON public.site_settings;
DROP POLICY IF EXISTS "Admin Write Settings"         ON public.site_settings;

-- ============================================================================
-- 4. BUAT POLICY BARU (AMAN UNTUK ANON & AUTHENTICATED)
-- ============================================================================

-- Cities: publik bisa baca semua
CREATE POLICY "Public Read Cities"
    ON public.cities
    FOR SELECT TO anon, authenticated
    USING (true);

-- Vendors: publik hanya lihat yang approved
CREATE POLICY "Public Read Approved Vendors"
    ON public.vendors
    FOR SELECT TO anon, authenticated
    USING (status = 'approved');

-- Vendors: publik bisa submit (status = pending)
CREATE POLICY "Public Insert Vendor Request"
    ON public.vendors
    FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'pending' AND is_verified = false);

-- Vendors: admin akses penuh
CREATE POLICY "Admin All Access Vendors"
    ON public.vendors
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- Auctions: publik hanya lihat yang active
CREATE POLICY "Public Read Auctions"
    ON public.auction_items
    FOR SELECT TO anon, authenticated
    USING (status = 'active');

-- Auctions: publik bisa insert
CREATE POLICY "Public Insert Auction"
    ON public.auction_items
    FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'active');

-- Auctions: admin akses penuh
CREATE POLICY "Admin All Access Auctions"
    ON public.auction_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- Bids: hanya admin yang bisa baca
CREATE POLICY "Admin Read Bids"
    ON public.bids
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- Admins: publik bisa baca untuk cek email
CREATE POLICY "Public Read Admins Email"
    ON public.admins
    FOR SELECT TO anon, authenticated
    USING (true);

-- Settings: publik baca, admin tulis
CREATE POLICY "Public Read Settings"
    ON public.site_settings
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admin Write Settings"
    ON public.site_settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- ============================================================================
-- 5. HELPER FUNCTION: is_admin()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$fn$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================================================
-- 6. HELPER FUNCTION: place_bid()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.place_bid(
    p_auction_id   UUID,
    p_bidder_name  TEXT,
    p_bidder_phone TEXT,
    p_bid_amount   NUMERIC
)
RETURNS public.auction_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $bid$
DECLARE
    v_item public.auction_items;
BEGIN
    IF length(btrim(coalesce(p_bidder_name, ''))) < 2 THEN
        RAISE EXCEPTION 'Nama penawar tidak valid.';
    END IF;

    IF length(btrim(coalesce(p_bidder_phone, ''))) < 8 THEN
        RAISE EXCEPTION 'Nomor WhatsApp penawar tidak valid.';
    END IF;

    SELECT * INTO v_item
    FROM public.auction_items
    WHERE id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item lelang tidak ditemukan.';
    END IF;

    IF v_item.status <> 'active' THEN
        RAISE EXCEPTION 'Lelang untuk barang ini sudah ditutup.';
    END IF;

    IF v_item.end_time <= now() THEN
        RAISE EXCEPTION 'Waktu lelang sudah berakhir.';
    END IF;

    IF p_bid_amount <= v_item.current_bid THEN
        RAISE EXCEPTION 'Penawaran harus lebih tinggi dari Rp %.', v_item.current_bid;
    END IF;

    INSERT INTO public.bids (auction_id, bidder_name, bidder_phone, bid_amount)
    VALUES (p_auction_id, btrim(p_bidder_name), btrim(p_bidder_phone), p_bid_amount);

    UPDATE public.auction_items
    SET current_bid    = p_bid_amount,
        highest_bidder = btrim(p_bidder_name),
        bids_count     = bids_count + 1
    WHERE id = p_auction_id
    RETURNING * INTO v_item;

    RETURN v_item;
END;
$bid$;

GRANT EXECUTE ON FUNCTION public.place_bid(UUID, TEXT, TEXT, NUMERIC) TO anon, authenticated;

-- ============================================================================
-- 7. HELPER FUNCTION: total_donation_raised()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.total_donation_raised()
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $tot$
    SELECT coalesce((SELECT donation_base FROM public.site_settings WHERE id = 1), 0)
         + coalesce((SELECT sum(current_bid) FROM public.auction_items), 0);
$tot$;

GRANT EXECUTE ON FUNCTION public.total_donation_raised() TO anon, authenticated;

-- ============================================================================
-- 8. INDEX
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_vendors_status  ON public.vendors (status);
CREATE INDEX IF NOT EXISTS idx_vendors_city    ON public.vendors (city);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auction_items (status);
CREATE INDEX IF NOT EXISTS idx_bids_auction    ON public.bids (auction_id);

-- ============================================================================
-- 9. SEED DATA (opsional - hanya jika kosong)
-- ============================================================================
INSERT INTO public.cities (name) VALUES
('Makassar'), ('Gowa'), ('Malino'), ('Maros'),
('Tana Toraja'), ('Toraja Utara'), ('Palopo'),
('Bone'), ('Bulukumba'), ('Bantaeng'), ('Enrekang'), ('Sinjai')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.site_settings (id, donation_base)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. VERIFIKASI
-- ============================================================================
SELECT 
    'vendors' AS table_name, count(*) AS row_count FROM public.vendors
UNION ALL
    SELECT 'auction_items', count(*) FROM public.auction_items
UNION ALL
    SELECT 'admins', count(*) FROM public.admins
UNION ALL
    SELECT 'cities', count(*) FROM public.cities;

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
SELECT * FROM public.vendors LIMIT 5;
SELECT public.total_donation_raised() AS total_donasi;
