-- =====================================================================
-- BIVAK RENTAL - Katalog barang vendor (aman)
-- Project Supabase: pledqkanjduhabruvgxx
-- Jalankan SETELAH db/OLSHOP-01-VENDOR-SECURITY.sql
--
-- Tujuan:
--   1. Rapikan tabel vendor_items (tanpa data ganda, stok tidak minus).
--   2. Tutup lubang RLS lama: policy "vendor_items_all_anon" membuat
--      SIAPA PUN bisa menambah/mengubah/menghapus barang vendor lain.
--   3. Publik hanya boleh MEMBACA barang milik vendor yang sudah
--      disetujui admin. Semua perubahan lewat RPC bertoken (PIN toko),
--      sehingga tiap vendor hanya bisa mengubah barangnya sendiri.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Struktur tabel
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_items (
	id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	vendor_id       uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
	name            text NOT NULL,
	category        text NOT NULL DEFAULT 'accessories',
	price_per_day   numeric(12,2) NOT NULL DEFAULT 0,
	stock_total     int NOT NULL DEFAULT 1,
	stock_available int NOT NULL DEFAULT 1,
	photo_url       text,
	description     text,
	status          text NOT NULL DEFAULT 'available',
	created_at      timestamptz NOT NULL DEFAULT now(),
	updated_at      timestamptz NOT NULL DEFAULT now()
);

-- kolom menyusul bila tabel dibuat versi lama
ALTER TABLE public.vendor_items ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.vendor_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.vendor_items ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available';
ALTER TABLE public.vendor_items ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.vendor_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- 2. Bersihkan data lama
-- ---------------------------------------------------------------------
DELETE FROM public.vendor_items WHERE vendor_id IS NULL;
ALTER TABLE public.vendor_items ALTER COLUMN vendor_id SET NOT NULL;

UPDATE public.vendor_items SET name = btrim(name);
DELETE FROM public.vendor_items WHERE coalesce(btrim(name), '') = '';
UPDATE public.vendor_items SET stock_total = 0 WHERE stock_total < 0;
UPDATE public.vendor_items SET stock_available = 0 WHERE stock_available < 0;
UPDATE public.vendor_items SET stock_available = stock_total WHERE stock_available > stock_total;
UPDATE public.vendor_items SET price_per_day = 0 WHERE price_per_day < 0;
UPDATE public.vendor_items SET category = 'accessories' WHERE coalesce(btrim(category), '') = '';

-- buang barang kembar (nama sama pada vendor yang sama), sisakan yang tertua
DELETE FROM public.vendor_items a
USING public.vendor_items b
WHERE a.vendor_id = b.vendor_id
  AND lower(a.name) = lower(b.name)
  AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_items_vendor_name
	ON public.vendor_items (vendor_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON public.vendor_items (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_category ON public.vendor_items (category);

-- ---------------------------------------------------------------------
-- 3. Pagar data (constraint)
-- ---------------------------------------------------------------------
DO $c$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_items_stock_chk') THEN
		ALTER TABLE public.vendor_items
		ADD CONSTRAINT vendor_items_stock_chk
		CHECK (stock_total >= 0 AND stock_available >= 0 AND stock_available <= stock_total);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_items_price_chk') THEN
		ALTER TABLE public.vendor_items
		ADD CONSTRAINT vendor_items_price_chk CHECK (price_per_day >= 0);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_items_status_chk') THEN
		ALTER TABLE public.vendor_items
		ADD CONSTRAINT vendor_items_status_chk
		CHECK (status IN ('available', 'rented_out', 'maintenance', 'archived'));
	END IF;
END
$c$;

-- updated_at otomatis
CREATE OR REPLACE FUNCTION public.vendor_items_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_vendor_items_touch ON public.vendor_items;
CREATE TRIGGER trg_vendor_items_touch
BEFORE UPDATE ON public.vendor_items
FOR EACH ROW EXECUTE FUNCTION public.vendor_items_touch();

-- ---------------------------------------------------------------------
-- 4. RLS: publik hanya baca barang vendor yang sudah disetujui
-- ---------------------------------------------------------------------
ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_items_all_anon" ON public.vendor_items;      -- lubang lama: FOR ALL USING (true)
DROP POLICY IF EXISTS "vendor_items_select_public" ON public.vendor_items;
DROP POLICY IF EXISTS "vendor_items_public_read" ON public.vendor_items;
DROP POLICY IF EXISTS "vendor_items_admin_all" ON public.vendor_items;

CREATE POLICY "vendor_items_public_read"
ON public.vendor_items
FOR SELECT
TO anon, authenticated
USING (
	status <> 'archived'
	AND EXISTS (
		SELECT 1 FROM public.vendors v
		WHERE v.id = vendor_items.vendor_id
		  AND v.status = 'approved'
		  AND v.is_verified = true
		  AND v.approved_at IS NOT NULL
	)
);

CREATE POLICY "vendor_items_admin_all"
ON public.vendor_items
FOR ALL
TO authenticated
USING (public.bivak_is_privileged())
WITH CHECK (public.bivak_is_privileged());

-- anon boleh baca saja; menulis harus lewat RPC bertoken
REVOKE INSERT, UPDATE, DELETE ON public.vendor_items FROM anon;
GRANT SELECT ON public.vendor_items TO anon, authenticated;

-- RPC lama yang menerima PIN mentah tidak dipakai lagi
DROP FUNCTION IF EXISTS public.update_vendor_item_stock(uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.update_vendor_item_stock(uuid, text, integer);

-- ---------------------------------------------------------------------
-- 5. RPC: vendor mengelola barangnya sendiri (pakai token dari login PIN)
-- ---------------------------------------------------------------------

-- 5a. Daftar barang milik toko
CREATE OR REPLACE FUNCTION public.vendor_shop_items(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
	v_vendor uuid;
	v_info jsonb;
	v_items jsonb;
BEGIN
	v_vendor := public.vendor_session_vendor(p_token);
	IF v_vendor IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'Sesi berakhir. Masuk ulang dengan PIN toko.');
	END IF;

	SELECT jsonb_build_object('id', v.id, 'name', v.name, 'city', v.city, 'phone', v.phone)
	INTO v_info
	FROM public.vendors v WHERE v.id = v_vendor;

	SELECT coalesce(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb)
	INTO v_items
	FROM (
		SELECT to_jsonb(i) AS x
		FROM public.vendor_items i
		WHERE i.vendor_id = v_vendor
	) t;

	RETURN jsonb_build_object('success', true, 'vendor', v_info, 'items', v_items);
END
$fn$;

-- 5b. Tambah / ubah barang
CREATE OR REPLACE FUNCTION public.vendor_shop_item_save(p_token uuid, p_item jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
	v_vendor uuid;
	v_id uuid;
	v_name text;
	v_cat text;
	v_price numeric(12,2);
	v_total int;
	v_photo text;
	v_desc text;
	v_avail int;
	v_row public.vendor_items;
BEGIN
	v_vendor := public.vendor_session_vendor(p_token);
	IF v_vendor IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'Sesi berakhir. Masuk ulang dengan PIN toko.');
	END IF;

	v_id    := nullif(p_item->>'id', '')::uuid;
	v_name  := btrim(coalesce(p_item->>'name', ''));
	v_cat   := lower(btrim(coalesce(nullif(p_item->>'category', ''), 'accessories')));
	v_price := round(coalesce((p_item->>'price_per_day')::numeric, 0), 2);
	v_total := coalesce((p_item->>'stock_total')::int, 0);
	v_photo := nullif(btrim(coalesce(p_item->>'photo_url', '')), '');
	v_desc  := nullif(btrim(coalesce(p_item->>'description', '')), '');

	IF length(v_name) < 3 THEN
		RETURN jsonb_build_object('success', false, 'message', 'Nama barang minimal 3 karakter.');
	END IF;
	IF v_cat NOT IN ('tenda', 'carrier', 'cooking', 'sleep', 'lighting', 'apparel', 'accessories') THEN
		v_cat := 'accessories';
	END IF;
	IF v_price <= 0 THEN
		RETURN jsonb_build_object('success', false, 'message', 'Harga sewa per hari harus lebih dari 0.');
	END IF;
	IF v_total <= 0 OR v_total > 999 THEN
		RETURN jsonb_build_object('success', false, 'message', 'Jumlah unit harus antara 1 sampai 999.');
	END IF;

	-- nama tidak boleh kembar di toko yang sama
	IF EXISTS (
		SELECT 1 FROM public.vendor_items i
		WHERE i.vendor_id = v_vendor
		  AND lower(i.name) = lower(v_name)
		  AND (v_id IS NULL OR i.id <> v_id)
	) THEN
		RETURN jsonb_build_object('success', false, 'message', 'Sudah ada barang dengan nama itu di toko Anda.');
	END IF;

	IF v_id IS NULL THEN
		INSERT INTO public.vendor_items (vendor_id, name, category, price_per_day, stock_total, stock_available, photo_url, description, status)
		VALUES (v_vendor, v_name, v_cat, v_price, v_total, v_total, v_photo, v_desc, 'available')
		RETURNING * INTO v_row;
	ELSE
		IF NOT EXISTS (SELECT 1 FROM public.vendor_items WHERE id = v_id AND vendor_id = v_vendor) THEN
			RETURN jsonb_build_object('success', false, 'message', 'Barang tidak ditemukan di toko Anda.');
		END IF;

		SELECT LEAST(stock_available, v_total) INTO v_avail
		FROM public.vendor_items WHERE id = v_id;

		UPDATE public.vendor_items
		SET name = v_name,
		    category = v_cat,
		    price_per_day = v_price,
		    stock_total = v_total,
		    stock_available = coalesce(v_avail, v_total),
		    photo_url = coalesce(v_photo, photo_url),
		    description = v_desc,
		    status = CASE WHEN status = 'archived' THEN 'available' ELSE status END
		WHERE id = v_id AND vendor_id = v_vendor
		RETURNING * INTO v_row;
	END IF;

	RETURN jsonb_build_object('success', true, 'item', to_jsonb(v_row));
END
$fn$;

-- 5c. Ubah jumlah unit yang siap disewa
CREATE OR REPLACE FUNCTION public.vendor_shop_set_stock(p_token uuid, p_item_id uuid, p_stock int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
	v_vendor uuid;
	v_total int;
	v_new int;
BEGIN
	v_vendor := public.vendor_session_vendor(p_token);
	IF v_vendor IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'Sesi berakhir. Masuk ulang dengan PIN toko.');
	END IF;

	SELECT stock_total INTO v_total
	FROM public.vendor_items
	WHERE id = p_item_id AND vendor_id = v_vendor;

	IF v_total IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'Barang tidak ditemukan di toko Anda.');
	END IF;

	v_new := GREATEST(0, LEAST(coalesce(p_stock, 0), v_total));

	UPDATE public.vendor_items
	SET stock_available = v_new,
	    status = CASE
	        WHEN status = 'archived' THEN 'archived'
	        WHEN v_new = 0 THEN 'rented_out'
	        ELSE 'available'
	    END
	WHERE id = p_item_id AND vendor_id = v_vendor;

	RETURN jsonb_build_object('success', true, 'stock_available', v_new, 'stock_total', v_total);
END
$fn$;

-- 5d. Hapus barang
CREATE OR REPLACE FUNCTION public.vendor_shop_item_delete(p_token uuid, p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
	v_vendor uuid;
	v_deleted int;
BEGIN
	v_vendor := public.vendor_session_vendor(p_token);
	IF v_vendor IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'Sesi berakhir. Masuk ulang dengan PIN toko.');
	END IF;

	DELETE FROM public.vendor_items
	WHERE id = p_item_id AND vendor_id = v_vendor;

	GET DIAGNOSTICS v_deleted = ROW_COUNT;

	IF v_deleted = 0 THEN
		RETURN jsonb_build_object('success', false, 'message', 'Barang tidak ditemukan di toko Anda.');
	END IF;

	RETURN jsonb_build_object('success', true, 'message', 'Barang dihapus dari katalog.');
END
$fn$;

-- ---------------------------------------------------------------------
-- 6. Hak eksekusi RPC
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.vendor_shop_items(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vendor_shop_item_save(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vendor_shop_set_stock(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vendor_shop_item_delete(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.vendor_shop_items(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_shop_item_save(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_shop_set_stock(uuid, uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_shop_item_delete(uuid, uuid) TO anon, authenticated;

COMMIT;
