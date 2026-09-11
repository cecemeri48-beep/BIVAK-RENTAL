-- ==========================================================================
-- ADOPSI-07: KODE ADOPSI SEKALI PAKAI (TERKUNCI KE SATU NAMA)
-- --------------------------------------------------------------------------
-- Sebelumnya: kode POH-XXXXX yang sudah terverifikasi bisa dipakai BERULANG
-- kali, oleh SIAPA SAJA yang tahu kodenya, dengan nama bebas -- jadi satu
-- kode bisa dibagikan untuk mencetak banyak sertifikat.
--
-- Setelah file ini dijalankan (di SQL Editor project donasi ncoueeeskzslldppsbvx):
--   * Kode yang belum pernah dipakai -> bisa dipakai SEKALI untuk menerbitkan
--     sertifikat; nama penerima & waktu penerbitan dicatat di tabel.
--   * Kode yang sudah dipakai -> menolak nama lain.
--   * Pengecualian: nama yang SAMA persis (tidak peka huruf besar/kecil)
--     boleh mengunduh ulang -- untuk kasus file PNG hilang / mau cetak lagi.
--   * check_adoption_code() ikut melaporkan status terpakai supaya web bisa
--     mengisi nama otomatis dan menjelaskan situasinya ke pengguna.
--
-- Idempoten: aman dijalankan berulang kali.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. PAGAR: pastikan ini project donasi/Pintu Angin.
--    Kalau tabelnya tidak ada di sini, berarti Anda sedang di project yang
--    salah -> hentikan dengan pesan yang jelas, bukan error 42P01.
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.donasi') IS NULL OR to_regclass('public.adoption_requests') IS NULL THEN
    RAISE EXCEPTION 'PROJECT SALAH: tabel donasi/adoption_requests tidak ditemukan. Jalankan file ini di SQL Editor project DONASI/Pintu Angin (ncoueeeskzslldppsbvx) -- tempat ADOPSI-06 kemarin berhasil dijalankan -- BUKAN di project utama (pledqkanjduhabruvgxx). Cek nama project di pojok kiri atas dashboard Supabase.';
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 1. Kolom pencatat pemakaian kode
-- --------------------------------------------------------------------------
ALTER TABLE public.adoption_requests
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz,
  ADD COLUMN IF NOT EXISTS redeemed_by text;

-- --------------------------------------------------------------------------
-- 2. Cek kode: sekarang sekalian melaporkan status terpakai
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_adoption_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.adoption_requests%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Format kode salah.');
  END IF;

  SELECT * INTO r
  FROM public.adoption_requests
  WHERE upper(adoption_code) = upper(trim(p_code))
    AND status = 'terverifikasi'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Kode tidak ditemukan atau belum diverifikasi.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', r.adoption_code,
    'quantity', coalesce(r.quantity, 1),
    'package_name', r.package_name,
    'redeemed', (r.redeemed_at IS NOT NULL),
    'redeemed_by', r.redeemed_by,
    'redeemed_at', r.redeemed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_adoption_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_adoption_code(text) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Klaim kode saat sertifikat diterbitkan
--    Atomik: dua permintaan bersamaan tidak bisa sama-sama menang karena
--    syarat UPDATE-nya "redeemed_at IS NULL".
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_adoption_code(p_code text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.adoption_requests%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 8
     OR p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kode atau nama tidak valid.');
  END IF;

  -- Klaim pertama: hanya berhasil bila kode terverifikasi DAN belum terpakai
  UPDATE public.adoption_requests
  SET redeemed_at = now(), redeemed_by = left(trim(p_name), 120)
  WHERE upper(adoption_code) = upper(trim(p_code))
    AND status = 'terverifikasi'
    AND redeemed_at IS NULL
  RETURNING * INTO r;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'fresh', true,
      'code', r.adoption_code,
      'quantity', coalesce(r.quantity, 1),
      'package_name', r.package_name
    );
  END IF;

  -- Sudah terpakai (atau kode tidak valid): ambil barisnya untuk dicek
  SELECT * INTO r
  FROM public.adoption_requests
  WHERE upper(adoption_code) = upper(trim(p_code))
    AND status = 'terverifikasi'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Kode tidak ditemukan atau belum diverifikasi.');
  END IF;

  -- Nama sama persis -> boleh unduh ulang (kasus file hilang / cetak lagi)
  IF lower(trim(coalesce(r.redeemed_by, ''))) = lower(trim(p_name)) THEN
    RETURN jsonb_build_object(
      'success', true, 'fresh', false,
      'message', 'Sertifikat atas nama ini memang sudah pernah diterbitkan; diterbitkan ulang.',
      'code', r.adoption_code,
      'quantity', coalesce(r.quantity, 1),
      'package_name', r.package_name
    );
  END IF;

  -- Nama berbeda -> tolak
  RETURN jsonb_build_object(
    'success', false, 'already', true,
    'message', 'Kode ini sudah dipakai untuk menerbitkan sertifikat pada ' ||
               to_char(r.redeemed_at AT TIME ZONE 'Asia/Makassar', 'DD-MM-YYYY HH24:MI') ||
               ' WITA. Satu kode hanya untuk satu nama.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_adoption_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_adoption_code(text, text) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Uji cepat (opsional, pakai kode asli hasil verifikasi admin)
-- --------------------------------------------------------------------------
-- SELECT public.redeem_adoption_code('POH-XXXXX', 'Nama Tes');   -- berhasil
-- SELECT public.redeem_adoption_code('POH-XXXXX', 'Nama Tes');   -- boleh (nama sama)
-- SELECT public.redeem_adoption_code('POH-XXXXX', 'Nama Lain');  -- ditolak
