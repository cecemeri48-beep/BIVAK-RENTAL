-- =====================================================================
-- BIVAK RENTAL - PIN toko langsung dari Panel Admin
-- Jalankan SETELAH db/OLSHOP-01-VENDOR-SECURITY.sql dan 02.
--
-- Setelah file ini dijalankan, admin TIDAK PERLU lagi membuka Supabase
-- untuk membuat PIN vendor. Semua dilakukan dari Panel Admin di web:
-- vendor di-approve -> PIN langsung tampil di layar admin.
--
-- Aman karena Panel Admin memakai login Supabase Auth, dan semua fungsi
-- di bawah menolak siapa pun yang bukan admin (cek tabel public.admins).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Buat PIN baru untuk satu vendor. PIN plaintext dikembalikan SEKALI
--    supaya bisa ditampilkan/dikirim ke vendor, yang tersimpan hanya hash.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_vendor_issue_pin(p_vendor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
	v_pin text;
	v_name text;
	v_phone text;
	v_city text;
BEGIN
	IF NOT public.bivak_is_privileged() THEN
		RETURN jsonb_build_object('success', false, 'message', 'Khusus admin. Masuk dulu ke Panel Admin.');
	END IF;

	SELECT v.name, v.phone, v.city INTO v_name, v_phone, v_city
	FROM public.vendors v WHERE v.id = p_vendor_id;

	IF v_name IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'Vendor tidak ditemukan.');
	END IF;

	v_pin := lpad(((floor(random() * 900000) + 100000)::int)::text, 6, '0');

	INSERT INTO public.vendor_secrets (vendor_id, pin_hash, failed_count, locked_until, updated_at)
	VALUES (p_vendor_id, crypt(v_pin, gen_salt('bf', 10)), 0, NULL, now())
	ON CONFLICT (vendor_id) DO UPDATE
	SET pin_hash = EXCLUDED.pin_hash, failed_count = 0, locked_until = NULL, updated_at = now();

	-- PIN lama tidak berlaku lagi: putus semua sesi toko yang masih terbuka
	DELETE FROM public.vendor_sessions WHERE vendor_id = p_vendor_id;

	RETURN jsonb_build_object(
		'success', true,
		'pin', v_pin,
		'is_new', true,
		'vendor', jsonb_build_object('id', p_vendor_id, 'name', v_name, 'phone', v_phone, 'city', v_city)
	);
END
$fn$;

-- ---------------------------------------------------------------------
-- 2. Pastikan vendor punya PIN. Dipakai otomatis saat admin menyetujui
--    vendor baru: kalau belum punya PIN -> dibuat dan ditampilkan.
--    Kalau sudah punya -> PIN lama TIDAK diubah (tidak dibocorkan juga).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_vendor_pin_ensure(p_vendor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_exists boolean;
BEGIN
	IF NOT public.bivak_is_privileged() THEN
		RETURN jsonb_build_object('success', false, 'message', 'Khusus admin. Masuk dulu ke Panel Admin.');
	END IF;

	SELECT EXISTS (SELECT 1 FROM public.vendor_secrets WHERE vendor_id = p_vendor_id) INTO v_exists;

	IF v_exists THEN
		RETURN jsonb_build_object(
			'success', true,
			'pin', NULL,
			'is_new', false,
			'message', 'Toko ini sudah punya PIN. Kalau vendor lupa, buat PIN baru.'
		);
	END IF;

	RETURN public.admin_vendor_issue_pin(p_vendor_id);
END
$fn$;

-- ---------------------------------------------------------------------
-- 3. Daftar status PIN semua vendor (untuk penanda di Panel Admin)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_vendor_pin_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_rows jsonb;
BEGIN
	IF NOT public.bivak_is_privileged() THEN
		RETURN jsonb_build_object('success', false, 'message', 'Khusus admin.');
	END IF;

	SELECT coalesce(jsonb_agg(jsonb_build_object(
		'vendor_id', v.id,
		'name', v.name,
		'status', v.status,
		'has_pin', (s.vendor_id IS NOT NULL),
		'locked_until', s.locked_until,
		'items', (SELECT count(*) FROM public.vendor_items i WHERE i.vendor_id = v.id)
	)), '[]'::jsonb)
	INTO v_rows
	FROM public.vendors v
	LEFT JOIN public.vendor_secrets s ON s.vendor_id = v.id;

	RETURN jsonb_build_object('success', true, 'vendors', v_rows);
END
$fn$;

-- ---------------------------------------------------------------------
-- 4. Buka kunci toko yang salah PIN 5x (tanpa mengganti PIN)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_vendor_pin_unlock(p_vendor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
	IF NOT public.bivak_is_privileged() THEN
		RETURN jsonb_build_object('success', false, 'message', 'Khusus admin.');
	END IF;

	UPDATE public.vendor_secrets
	SET failed_count = 0, locked_until = NULL, updated_at = now()
	WHERE vendor_id = p_vendor_id;

	RETURN jsonb_build_object('success', true, 'message', 'Kunci dibuka. Vendor bisa mencoba PIN lagi.');
END
$fn$;

-- ---------------------------------------------------------------------
-- 5. Hak eksekusi: hanya sesi login (admin), bukan pengunjung biasa
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_vendor_issue_pin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_vendor_pin_ensure(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_vendor_pin_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_vendor_pin_unlock(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_vendor_issue_pin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_vendor_pin_ensure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_vendor_pin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_vendor_pin_unlock(uuid) TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------
-- Catatan: fungsi di atas memakai public.is_admin() (lewat
-- public.bivak_is_privileged()). Kalau Panel Admin menolak dengan pesan
-- "Khusus admin", berarti email yang dipakai belum ada di tabel
-- public.admins -> jalankan ADD-ADMIN-EMAIL.sql lebih dulu.
-- ---------------------------------------------------------------------
