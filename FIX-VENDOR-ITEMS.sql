-- ====================================================================
-- BIVAK RENTAL - SKEMA OLSHOP GEAR CATALOG & STOK MANAGEMENT (OPSI A)
-- File: FIX-VENDOR-ITEMS.sql
-- ====================================================================

-- 1. Tambah kolom PIN rahasia untuk kelola toko di tabel vendors (jika belum ada)
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS edit_pin VARCHAR(10) DEFAULT LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

-- Update vendor yang belum punya PIN
UPDATE public.vendors 
SET edit_pin = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0') 
WHERE edit_pin IS NULL;

-- 2. Buat tabel vendor_items (Katalog Barang Sewa per Vendor)
CREATE TABLE IF NOT EXISTS public.vendor_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    category        VARCHAR(50) NOT NULL DEFAULT 'tenda', -- tenda, carrier, cooking, sleep, lighting, apparel, accessories
    price_per_day   NUMERIC(12,2) NOT NULL DEFAULT 25000,
    stock_total     INT NOT NULL DEFAULT 1,
    stock_available INT NOT NULL DEFAULT 1,
    photo_url       TEXT,
    description     TEXT,
    status          VARCHAR(30) DEFAULT 'available', -- available, rented_out, maintenance, archived
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks performa
CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor_id ON public.vendor_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_category ON public.vendor_items(category);
CREATE INDEX IF NOT EXISTS idx_vendor_items_status ON public.vendor_items(status);

-- 3. Row Level Security (RLS)
ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;

-- Publik bisa melihat barang dari vendor yang berstatus approved
DROP POLICY IF EXISTS "vendor_items_select_public" ON public.vendor_items;
CREATE POLICY "vendor_items_select_public" ON public.vendor_items
FOR SELECT USING (true);

-- Insert/Update/Delete terbuka untuk public anon (validasi PIN dihandle via RPC atau app logic)
DROP POLICY IF EXISTS "vendor_items_all_anon" ON public.vendor_items;
CREATE POLICY "vendor_items_all_anon" ON public.vendor_items
FOR ALL USING (true) WITH CHECK (true);

-- 4. Function RPC untuk Update Stok Aman dengan PIN
CREATE OR REPLACE FUNCTION public.update_vendor_item_stock(
    p_item_id UUID,
    p_pin VARCHAR,
    p_new_stock INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vendor_id UUID;
    v_vendor_pin VARCHAR;
    v_total_stock INT;
BEGIN
    -- Ambil data vendor terkait
    SELECT vi.vendor_id, v.edit_pin, vi.stock_total 
    INTO v_vendor_id, v_vendor_pin, v_total_stock
    FROM public.vendor_items vi
    JOIN public.vendors v ON v.id = vi.vendor_id
    WHERE vi.id = p_item_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Barang tidak ditemukan.');
    END IF;

    -- Cek PIN
    IF v_vendor_pin IS DISTINCT FROM p_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'PIN Toko tidak sesuai.');
    END IF;

    -- Validasi stok tidak boleh negatif
    IF p_new_stock < 0 THEN
        p_new_stock := 0;
    END IF;

    -- Update stok
    UPDATE public.vendor_items
    SET stock_available = p_new_stock,
        status = CASE WHEN p_new_stock = 0 THEN 'rented_out' ELSE 'available' END,
        updated_at = now()
    WHERE id = p_item_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Stok berhasil diperbarui.',
        'stock_available', p_new_stock
    );
END;
$$;

-- 5. Seed Data Demo Barang untuk Vendor yang Sudah Ada
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, name FROM public.vendors WHERE status = 'approved' LOOP
        -- Tenda
        INSERT INTO public.vendor_items (vendor_id, name, category, price_per_day, stock_total, stock_available, photo_url, description)
        VALUES 
        (r.id, 'Tenda Dome Double Layer 4P', 'tenda', 45000, 5, 4, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=500', 'Kapasitas 4 orang, frame alloy, waterproof 3000mm, include pasak & tali'),
        (r.id, 'Carrier Expedition 65L + Raincover', 'carrier', 35000, 4, 3, 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=500', 'Backsystem empuk, adjustable torso, kapasitas 65 liter + bonus cover'),
        (r.id, 'Sleeping Bag Polar Bulu Tebal', 'sleep', 15000, 8, 6, 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=500', 'Lapisan dalam polar hangat, nyaman suhu 10-15°C Bawakaraeng'),
        (r.id, 'Kompor Portable Camping + Adaptor Gas', 'cooking', 12000, 6, 5, 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=500', 'Model windproof mawar, api stabil saat angin kencang di pos pendakian'),
        (r.id, 'Nesting Cookset 4-in-1 Anodized', 'cooking', 15000, 4, 2, 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=500', 'Panci + wajan + teko anti lengket bahan aluminium anodized super ringan'),
        (r.id, 'Headlamp LED 500 Lumens Waterproof', 'lighting', 10000, 10, 8, 'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=500', 'Rechargeable USB-C, 3 mode cahaya + sensor gerak tangan')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
