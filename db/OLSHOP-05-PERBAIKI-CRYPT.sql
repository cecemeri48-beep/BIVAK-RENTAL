-- ============================================================================
-- BIVAK RENTAL - OLSHOP-05: PERBAIKI AKSES pgcrypto (crypt / gen_salt)
-- ============================================================================
-- GEJALA
--   Panel Admin berkata "Fitur Belum Dipasang - Jalankan db/OLSHOP-04..."
--   atau login toko berkata "Login toko belum aktif", PADAHAL OLSHOP-01,
--   02, dan 04 sudah benar-benar dijalankan.
--
-- SEBAB
--   Fungsi-fungsi itu dibuat dengan "SET search_path = public", sedangkan di
--   Supabase ekstensi pgcrypto (penyedia crypt() dan gen_salt()) terpasang di
--   skema "extensions", bukan "public". Akibatnya, dari DALAM fungsi,
--   crypt() tidak terlihat dan PostgreSQL menjawab:
--       ERROR: function crypt(text, text) does not exist
--   Pesan itu mengandung kata "does not exist", sehingga web salah menyimpulkan
--   bahwa SQL-nya belum dijalankan. Fungsinya ADA, hanya tidak bisa melihat
--   pgcrypto.
--
-- PERBAIKAN
--   Tambahkan skema "extensions" ke search_path SEMUA fungsi vendor_shop_* dan
--   admin_vendor_*, tanpa mengubah isi fungsinya sama sekali.
--
-- CARA PAKAI
--   Tempelkan seluruh berkas ini ke Supabase SQL Editor lalu tekan Run.
--   Aman dijalankan berulang kali. Tidak menghapus data apa pun.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pastikan pgcrypto terpasang (di Supabase biasanya sudah, di skema extensions)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
		BEGIN
			CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
		EXCEPTION WHEN OTHERS THEN
			CREATE EXTENSION pgcrypto;
		END;
		RAISE NOTICE 'pgcrypto baru dipasang.';
	ELSE
		RAISE NOTICE 'pgcrypto sudah terpasang.';
	END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Beri semua fungsi terkait izin melihat skema extensions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
	r RECORD;
	jumlah INT := 0;
BEGIN
	FOR r IN
		SELECT p.oid::regprocedure AS tanda_tangan
		FROM pg_proc p
		JOIN pg_namespace ns ON ns.oid = p.pronamespace
		WHERE ns.nspname = 'public'
		  AND (
			p.proname LIKE 'vendor_shop_%'
			OR p.proname LIKE 'admin_vendor_%'
			OR p.proname IN (
				'is_admin',
				'bivak_is_privileged',
				'vendor_session_vendor',
				'force_new_vendor_pending',
				'vendor_items_touch'
			)
		  )
	LOOP
		EXECUTE format(
			'ALTER FUNCTION %s SET search_path = public, extensions, pg_temp',
			r.tanda_tangan
		);
		jumlah := jumlah + 1;
	END LOOP;

	RAISE NOTICE 'search_path diperbarui untuk % fungsi.', jumlah;

	IF jumlah = 0 THEN
		RAISE NOTICE 'Tidak ada fungsi ditemukan. Berarti OLSHOP-01/02/04 memang belum dijalankan.';
	END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Segarkan cache skema PostgREST (supaya RPC langsung terbaca web)
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 4. Uji cepat: pgcrypto sudah bisa dipakai?  (harus true)
-- ---------------------------------------------------------------------------
SET search_path = public, extensions;

SELECT crypt('123456', gen_salt('bf', 4)) IS NOT NULL AS pgcrypto_siap;

-- ---------------------------------------------------------------------------
-- 5. Periksa hasilnya: kolom "pengaturan" harus memuat kata extensions
-- ---------------------------------------------------------------------------
SELECT
	p.proname AS fungsi,
	pg_get_function_identity_arguments(p.oid) AS argumen,
	COALESCE(array_to_string(p.proconfig, ', '), '(tanpa search_path)') AS pengaturan
FROM pg_proc p
JOIN pg_namespace ns ON ns.oid = p.pronamespace
WHERE ns.nspname = 'public'
  AND (p.proname LIKE 'vendor_shop_%' OR p.proname LIKE 'admin_vendor_%')
ORDER BY 1;

-- ---------------------------------------------------------------------------
-- 6. Kalau tabel PIN belum punya baris untuk vendor tertentu, itu normal:
--    PIN dibuat saat admin menekan tombol PIN di Panel Admin.
-- ---------------------------------------------------------------------------
SELECT
	v.name AS nama_toko,
	CASE WHEN s.vendor_id IS NULL THEN 'belum ada PIN' ELSE 'sudah ada PIN' END AS status_pin,
	s.failed_count AS gagal_login,
	s.locked_until AS terkunci_sampai
FROM public.vendors v
LEFT JOIN public.vendor_secrets s ON s.vendor_id = v.id
WHERE v.status = 'approved'
ORDER BY v.name;
