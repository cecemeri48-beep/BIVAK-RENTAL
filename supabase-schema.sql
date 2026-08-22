-- ==========================================================================
-- BIVAK (Bursa Interaktif Vendor Alam & Komunitas Sulawesi Selatan)
-- Database Schema for Supabase PostgreSQL  --  v3
-- --------------------------------------------------------------------------
-- CARA PAKAI
-- Buka Supabase > SQL Editor > New query, lalu jalankan BLOK PER BLOK
-- sesuai nomor di bawah (satu blok satu kali Run). Jangan tempel seluruh
-- file sekaligus: tempelan yang sangat panjang mudah terpotong dan membuat
-- seluruh skrip batal tanpa jelas bagian mana yang gagal.
--
-- Perubahan dari v2:
--   - Blok DO $$ ... $$ untuk ENUM dihapus (menyebabkan error 42601 di
--     SQL Editor). Diganti CREATE TYPE biasa; abaikan bila sudah ada.
--   - Body fungsi memakai tag $fn$ / $bid$ / $tot$ agar tidak bentrok $$.
--   - Data contoh vendor memakai INSERT ... VALUES sederhana tanpa cast.
-- ==========================================================================


-- ==========================================================================
-- BLOK 1. TIPE DATA
-- Kalau muncul "type already exists", abaikan dan lanjut ke blok berikutnya.
-- ==========================================================================
CREATE TYPE vendor_status_type AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE auction_status_type AS ENUM ('active', 'completed', 'cancelled');


-- ==========================================================================
-- BLOK 2. TABEL UTAMA
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


-- ==========================================================================
-- BLOK 3. TABEL PENDUKUNG + SEED RINGAN + INDEKS
-- bids     : berisi nomor HP penawar, hanya admin yang boleh membaca.
-- admins   : siapa pun yang user_id-nya ada di sini punya akses Admin Panel.
-- settings : baris tunggal; donation_base = donasi historis sebelum online,
--            supaya statistik hero tidak turun drastis saat go-live.
-- ==========================================================================
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

INSERT INTO public.site_settings (id, donation_base)
VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cities (name) VALUES
('Makassar'), ('Gowa'), ('Malino'), ('Maros'),
('Tana Toraja'), ('Toraja Utara'), ('Palopo'),
('Bone'), ('Bulukumba'), ('Bantaeng'), ('Enrekang'), ('Sinjai')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_vendors_status  ON public.vendors (status);
CREATE INDEX IF NOT EXISTS idx_vendors_city    ON public.vendors (city);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auction_items (status);
CREATE INDEX IF NOT EXISTS idx_bids_auction    ON public.bids (auction_id);


-- ==========================================================================
-- BLOK 4. HELPER: apakah user yang login adalah admin?
-- SECURITY DEFINER supaya fungsi ini bisa membaca tabel admins tanpa
-- terjebak RLS-nya sendiri (kalau tidak, kebijakan jadi rekursif).
-- ==========================================================================
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


-- ==========================================================================
-- BLOK 5. ROW LEVEL SECURITY
-- DROP POLICY IF EXISTS di depan supaya blok ini aman dijalankan ulang.
-- ==========================================================================
ALTER TABLE public.cities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Cities"           ON public.cities;
DROP POLICY IF EXISTS "Public Read Approved Vendors" ON public.vendors;
DROP POLICY IF EXISTS "Public Insert Vendor Request" ON public.vendors;
DROP POLICY IF EXISTS "Admin All Access Vendors"     ON public.vendors;
DROP POLICY IF EXISTS "Public Read Auctions"         ON public.auction_items;
DROP POLICY IF EXISTS "Public Insert Auction"        ON public.auction_items;
DROP POLICY IF EXISTS "Admin All Access Auctions"    ON public.auction_items;
DROP POLICY IF EXISTS "Admin Read Bids"              ON public.bids;
DROP POLICY IF EXISTS "Admin Read Admins"            ON public.admins;
DROP POLICY IF EXISTS "Public Read Settings"         ON public.site_settings;
DROP POLICY IF EXISTS "Admin Write Settings"         ON public.site_settings;

-- 5a. Cities: publik boleh baca
CREATE POLICY "Public Read Cities"
ON public.cities FOR SELECT TO anon, authenticated USING (true);

-- 5b. Vendors: publik hanya melihat yang sudah di-approve
CREATE POLICY "Public Read Approved Vendors"
ON public.vendors FOR SELECT TO anon, authenticated USING (status = 'approved');

-- 5c. Vendors: siapa pun boleh mengajukan, TAPI dipaksa masuk antrean.
--     Cek is_verified = false mencegah pendaftar mencentang "Terverifikasi"
--     pada dirinya sendiri lewat API.
CREATE POLICY "Public Insert Vendor Request"
ON public.vendors FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND is_verified = false);

-- 5d. Vendors: admin akses penuh (antrean, approve, tolak, hapus)
CREATE POLICY "Admin All Access Vendors"
ON public.vendors FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5e. Lelang: publik melihat yang aktif
CREATE POLICY "Public Read Auctions"
ON public.auction_items FOR SELECT TO anon, authenticated USING (status = 'active');

-- 5f. Lelang: publik boleh mendonasikan barang.
--     CATATAN SPAM: barang langsung tayang tanpa moderasi. Kalau nanti kena
--     spam, ganti 'active' menjadi 'cancelled' di WITH CHECK baris bawah ini,
--     lalu admin yang mengaktifkan manual dari Admin Panel.
CREATE POLICY "Public Insert Auction"
ON public.auction_items FOR INSERT TO anon, authenticated WITH CHECK (status = 'active');

-- 5g. Lelang: admin akses penuh
CREATE POLICY "Admin All Access Auctions"
ON public.auction_items FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5h. Bids: TIDAK ADA insert publik langsung. Semua penawaran wajib lewat
--     place_bid() supaya validasi tidak bisa dilewati dari browser.
CREATE POLICY "Admin Read Bids"
ON public.bids FOR SELECT TO authenticated USING (public.is_admin());

-- 5i. Admins: anonymous boleh baca untuk cek email admin (email-only login)
CREATE POLICY "Public Read Admins Email"
ON public.admins FOR SELECT TO anon, authenticated USING (true);

-- 5j. Settings: publik baca, admin ubah
CREATE POLICY "Public Read Settings"
ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin Write Settings"
ON public.site_settings FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ==========================================================================
-- BLOK 6. RPC: place_bid()
-- Tanpa ini, penawar bisa memakai API key publik untuk menurunkan bid orang
-- lain atau menulis angka bebas. SECURITY DEFINER menjalankan validasi di
-- sisi server, dan SELECT ... FOR UPDATE mengunci baris supaya dua penawar
-- di detik yang sama tidak saling menimpa.
-- ==========================================================================
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


-- ==========================================================================
-- BLOK 7. RPC: total_donation_raised()
-- Total donasi = angka historis (donation_base) + seluruh bid tertinggi.
-- ==========================================================================
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


-- ==========================================================================
-- BLOK 8a. DATA CONTOH: tiga vendor pertama (opsional)
-- Tidak ada pengaman anti-duplikat. Jalankan sekali saja. Kalau terlanjur
-- dobel: DELETE FROM public.vendors;  lalu ulangi 8a dan 8b.
-- ==========================================================================
INSERT INTO public.vendors
  (name, city, address, phone, rating, reviews_count, min_price, gears, image_url, is_verified, status)
VALUES
('Celebes Outdoor Rental Makassar', 'Makassar',
 'Jl. Sultan Alauddin No. 88, Rappocini, Makassar', '6281245678901',
 4.90, 128, 15000,
 ARRAY['Tenda Dome 4P','Carrier 75L','Sleeping Bag','Kompor Portable','Flysheet 3x4'],
 'assets/gear-tent.png', true, 'approved'),
('Bawakaraeng Adventure Gowa', 'Gowa',
 'Jl. Poros Malino Km. 12, Sungguminasa, Gowa', '6285299887766',
 4.80, 95, 12000,
 ARRAY['Tenda Kapasitas 2-6P','Tracking Pole Carbon','Nesting Cookset','Lampu Tenda LED'],
 'assets/gear-carrier.png', true, 'approved'),
('Malino Highland Camp Gear', 'Malino',
 'Jl. Endang No. 15, kawasan Wisata Malino, Gowa', '6282188990011',
 5.00, 74, 20000,
 ARRAY['Tenda Family Luxury','Matras Thermal Foil','Hammock Double','Grill Barbeque'],
 'assets/hero-bg.png', true, 'approved');


-- ==========================================================================
-- BLOK 8b. DATA CONTOH: tiga vendor sisanya (opsional)
-- ==========================================================================
INSERT INTO public.vendors
  (name, city, address, phone, rating, reviews_count, min_price, gears, image_url, is_verified, status)
VALUES
('Rammang-Rammang Outdoor Maros', 'Maros',
 'Jl. Poros Maros-Pangkep Km. 5, Salewangang, Maros', '6281355443322',
 4.70, 62, 15000,
 ARRAY['Tenda Glamping','Life Jacket Water Sport','Kompor Ultralight','Headlamp waterproof'],
 'assets/gear-tent.png', true, 'approved'),
('Toraja Highland Explorer', 'Tana Toraja',
 'Jl. Ahmad Yani No. 24, Rantepao, Toraja Utara', '6281142009988',
 4.90, 110, 25000,
 ARRAY['Sepatu Tracking Waterproof','Jaket Windproof','Carrier 60L-80L','GPS Navigation'],
 'assets/auction-jacket.png', true, 'approved'),
('Palopo Camp & Trail Base', 'Palopo',
 'Jl. Jendral Sudirman No. 102, Wara, Palopo', '6285341122334',
 4.60, 48, 15000,
 ARRAY['Tenda Dome','Sleeping Bag Polar','Kompor Mawar','Botol Tumbler Thermal'],
 'assets/gear-carrier.png', true, 'approved');


-- ==========================================================================
-- BLOK 9. DATA CONTOH: lelang + angka donasi historis (opsional)
-- 45.800.000 - 2.700.000 (tiga lelang contoh) = 43.100.000
-- ==========================================================================
INSERT INTO public.auction_items
  (title, donor_name, donor_phone, cause_category, starting_bid, current_bid,
   highest_bidder, bids_count, end_time, image_url, description)
VALUES
('Jaket Gore-Tex Expedition Limited Edition', 'Celebes Outdoor Club Makassar',
 '6281245678901', 'Reboisasi Bawakaraeng', 250000, 850000,
 'Rian (Pendaki Makassar)', 14, now() + interval '1 day', 'assets/auction-jacket.png',
 'Jaket Gore-Tex waterproof kualitas ekspedisi. 100% donasi dialokasikan untuk pembibitan 200 bibit pohon di jalur Bawakaraeng.'),
('Carrier Deuter Aircontact Pro 75+10L', 'Komunitas KPA Latimojong',
 '6285299887766', 'Clean-Up Latimojong', 300000, 1200000,
 'Fikri (Maros)', 19, now() + interval '2 days', 'assets/gear-carrier.png',
 'Tas Carrier tangguh pemakaian 2x naik gunung. Hasil lelang untuk dana operasional pembersihan sampah plastik Jalur Latimojong.'),
('Tenda Dome Expedition 4 Person Aluminum Pole', 'Mapala UMI Makassar',
 '6282188990011', 'Tanggap Bencana Sulsel', 200000, 650000,
 'Andi Toraja', 9, now() + interval '12 hours', 'assets/gear-tent.png',
 'Tenda tahan angin badai dengan pasak aluminium alloy. Donasi disalurkan untuk posko bantuan banjir dan tanah longsor Sulsel.');

UPDATE public.site_settings SET donation_base = 43100000 WHERE id = 1;


-- ==========================================================================
-- BLOK 10. MENGANGKAT DIRI ANDA JADI ADMIN
-- 1) Supabase > Authentication > Users > Add user.
--    Isi email & password, WAJIB centang "Auto Confirm User".
-- 2) Ganti email di bawah dengan email yang barusan didaftarkan, lalu Run.
-- ==========================================================================
-- INSERT INTO public.admins (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'email-anda@contoh.com'
-- ON CONFLICT (user_id) DO NOTHING;


-- ==========================================================================
-- BLOK 11. VERIFIKASI
-- Hasil yang benar: vendor 6, lelang 3, admin 1, total_donasi 45800000
-- ==========================================================================
-- SELECT
--   (SELECT count(*) FROM public.vendors)       AS vendor,
--   (SELECT count(*) FROM public.auction_items) AS lelang,
--   (SELECT count(*) FROM public.admins)        AS admin,
--   public.total_donation_raised()              AS total_donasi;
