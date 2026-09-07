-- =====================================================================
-- BIVAK RENTAL - Keamanan login toko vendor (PIN toko)
-- Project Supabase: pledqkanjduhabruvgxx
-- Jalankan di SQL Editor. Urutan: 01 (file ini) -> 02 -> 03
--
-- Tujuan:
--   1. PIN toko TIDAK LAGI bisa dibaca dari browser (sebelumnya kolom
--      vendors.edit_pin bisa di-SELECT siapa pun dengan anon key).
--   2. PIN disimpan sebagai hash bcrypt di tabel terpisah tanpa policy.
--   3. Login toko lewat RPC + token sesi 12 jam, ada kunci otomatis
--      setelah 5 kali PIN salah.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tabel rahasia PIN (tidak pernah terekspos ke anon/authenticated)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_secrets (
	vendor_id    uuid PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
	pin_hash     text NOT NULL,
	failed_count int NOT NULL DEFAULT 0,
	locked_until timestamptz,
	updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_secrets FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Sesi kelola barang (token acak, kedaluwarsa 12 jam)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_sessions (
	token      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	vendor_id  uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours')
);

CREATE INDEX IF NOT EXISTS idx_vendor_sessions_vendor ON public.vendor_sessions (vendor_id);

ALTER TABLE public.vendor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_sessions FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Migrasi PIN lama (plaintext) -> hash, lalu buang kolom plaintext
-- ---------------------------------------------------------------------
DO $mig$
DECLARE r record;
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'edit_pin'
	) THEN
		FOR r IN SELECT id, nullif(btrim(edit_pin), '') AS pin FROM public.vendors LOOP
			INSERT INTO public.vendor_secrets (vendor_id, pin_hash)
			VALUES (
				r.id,
				crypt(
					coalesce(r.pin, lpad(((floor(random() * 900000) + 100000)::int)::text, 6, '0')),
					gen_salt('bf', 10)
				)
			)
			ON CONFLICT (vendor_id) DO NOTHING;
		END LOOP;

		ALTER TABLE public.vendors DROP COLUMN edit_pin;
		RAISE NOTICE 'Kolom vendors.edit_pin dipindahkan ke vendor_secrets (hash) dan dihapus.';
	END IF;
END
$mig$;

-- Vendor yang belum punya PIN: dibuatkan PIN acak.
-- Lihat / ganti PIN-nya lewat file db/OLSHOP-03-CEK-DAN-PIN.sql
INSERT INTO public.vendor_secrets (vendor_id, pin_hash)
SELECT v.id, crypt(lpad(((floor(random() * 900000) + 100000)::int)::text, 6, '0'), gen_salt('bf', 10))
FROM public.vendors v
WHERE NOT EXISTS (SELECT 1 FROM public.vendor_secrets s WHERE s.vendor_id = v.id);

-- ---------------------------------------------------------------------
-- 4. Helper hak akses (admin panel / SQL editor)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bivak_is_privileged()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_admin boolean := false;
BEGIN
	IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
		RETURN true;
	END IF;
	BEGIN
		SELECT public.is_admin() INTO v_admin;
	EXCEPTION
		WHEN undefined_function THEN v_admin := false;
	END;
	RETURN coalesce(v_admin, false);
END
$fn$;

-- ---------------------------------------------------------------------
-- 5. Ambil vendor dari token sesi (internal, tidak untuk anon)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vendor_session_vendor(p_token uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
	SELECT s.vendor_id
	FROM public.vendor_sessions s
	JOIN public.vendors v ON v.id = s.vendor_id
	WHERE s.token = p_token
	  AND s.expires_at > now()
	  AND v.status = 'approved'
$fn$;

-- ---------------------------------------------------------------------
-- 6. Login toko: nama toko + PIN -> token sesi
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vendor_shop_login(p_name text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
	v_id uuid;
	v_name text;
	v_city text;
	v_phone text;
	v_hash text;
	v_locked timestamptz;
	v_failed int;
	v_token uuid;
	v_matches int;
	v_needle text := lower(btrim(coalesce(p_name, '')));
BEGIN
	IF v_needle = '' OR coalesce(btrim(p_pin), '') = '' THEN
		RETURN jsonb_build_object('success', false, 'message', 'Nama toko dan PIN wajib diisi.');
	END IF;

	-- cocok persis dulu, baru cocok sebagian
	SELECT count(*) INTO v_matches
	FROM public.vendors v
	WHERE v.status = 'approved' AND lower(v.name) = v_needle;

	IF v_matches = 1 THEN
		SELECT v.id, v.name, v.city, v.phone INTO v_id, v_name, v_city, v_phone
		FROM public.vendors v
		WHERE v.status = 'approved' AND lower(v.name) = v_needle;
	ELSE
		SELECT count(*) INTO v_matches
		FROM public.vendors v
		WHERE v.status = 'approved' AND lower(v.name) LIKE '%' || v_needle || '%';

		IF v_matches = 0 THEN
			RETURN jsonb_build_object('success', false, 'message', 'Toko tidak ditemukan atau belum disetujui admin.');
		END IF;
		IF v_matches > 1 THEN
			RETURN jsonb_build_object('success', false, 'message', 'Nama toko kurang spesifik. Tulis nama lengkap toko.');
		END IF;

		SELECT v.id, v.name, v.city, v.phone INTO v_id, v_name, v_city, v_phone
		FROM public.vendors v
		WHERE v.status = 'approved' AND lower(v.name) LIKE '%' || v_needle || '%';
	END IF;

	SELECT s.pin_hash, s.locked_until, s.failed_count
	INTO v_hash, v_locked, v_failed
	FROM public.vendor_secrets s
	WHERE s.vendor_id = v_id;

	IF v_hash IS NULL THEN
		RETURN jsonb_build_object('success', false, 'message', 'PIN toko belum dibuat. Hubungi admin BIVAK.');
	END IF;

	IF v_locked IS NOT NULL AND v_locked > now() THEN
		RETURN jsonb_build_object(
			'success', false,
			'message', 'Terlalu banyak percobaan. Coba lagi setelah ' || to_char(v_locked AT TIME ZONE 'Asia/Makassar', 'HH24:MI') || ' WITA.'
		);
	END IF;

	IF crypt(btrim(p_pin), v_hash) <> v_hash THEN
		UPDATE public.vendor_secrets
		SET failed_count = failed_count + 1,
		    locked_until = CASE WHEN failed_count + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END,
		    updated_at = now()
		WHERE vendor_id = v_id;

		RETURN jsonb_build_object('success', false, 'message', 'PIN toko salah.');
	END IF;

	UPDATE public.vendor_secrets
	SET failed_count = 0, locked_until = NULL, updated_at = now()
	WHERE vendor_id = v_id;

	DELETE FROM public.vendor_sessions WHERE expires_at < now();

	INSERT INTO public.vendor_sessions (vendor_id) VALUES (v_id) RETURNING token INTO v_token;

	RETURN jsonb_build_object(
		'success', true,
		'token', v_token,
		'vendor', jsonb_build_object('id', v_id, 'name', v_name, 'city', v_city, 'phone', v_phone)
	);
END
$fn$;

CREATE OR REPLACE FUNCTION public.vendor_shop_logout(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
	DELETE FROM public.vendor_sessions WHERE token = p_token;
	RETURN jsonb_build_object('success', true);
END
$fn$;

-- ---------------------------------------------------------------------
-- 7. Admin: set / reset PIN toko
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_vendor_set_pin(p_vendor_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
	IF NOT public.bivak_is_privileged() THEN
		RETURN jsonb_build_object('success', false, 'message', 'Hanya admin yang boleh mengubah PIN toko.');
	END IF;
	IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN
		RETURN jsonb_build_object('success', false, 'message', 'PIN harus 6 angka.');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = p_vendor_id) THEN
		RETURN jsonb_build_object('success', false, 'message', 'Vendor tidak ditemukan.');
	END IF;

	INSERT INTO public.vendor_secrets (vendor_id, pin_hash, failed_count, locked_until, updated_at)
	VALUES (p_vendor_id, crypt(p_pin, gen_salt('bf', 10)), 0, NULL, now())
	ON CONFLICT (vendor_id) DO UPDATE
	SET pin_hash = EXCLUDED.pin_hash, failed_count = 0, locked_until = NULL, updated_at = now();

	DELETE FROM public.vendor_sessions WHERE vendor_id = p_vendor_id;

	RETURN jsonb_build_object('success', true, 'message', 'PIN toko diperbarui.');
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_vendor_reset_pin(p_vendor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_pin text;
BEGIN
	IF NOT public.bivak_is_privileged() THEN
		RAISE EXCEPTION 'Hanya admin yang boleh me-reset PIN toko.';
	END IF;

	v_pin := lpad(((floor(random() * 900000) + 100000)::int)::text, 6, '0');

	INSERT INTO public.vendor_secrets (vendor_id, pin_hash, failed_count, locked_until, updated_at)
	VALUES (p_vendor_id, crypt(v_pin, gen_salt('bf', 10)), 0, NULL, now())
	ON CONFLICT (vendor_id) DO UPDATE
	SET pin_hash = EXCLUDED.pin_hash, failed_count = 0, locked_until = NULL, updated_at = now();

	DELETE FROM public.vendor_sessions WHERE vendor_id = p_vendor_id;

	RETURN v_pin; -- tampil sekali, catat lalu berikan ke vendor
END
$fn$;

-- ---------------------------------------------------------------------
-- 8. Hak eksekusi
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.vendor_session_vendor(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bivak_is_privileged() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_vendor_set_pin(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_vendor_reset_pin(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.vendor_shop_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_shop_logout(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bivak_is_privileged() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_vendor_set_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_vendor_reset_pin(uuid) TO authenticated;

COMMIT;
