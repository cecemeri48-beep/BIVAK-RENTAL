-- ==========================================================================
-- ADOPSI-06 v2: TUTUP CELAH KRITIS RLS DONASI & ADOPSI (JALANKAN SEKALI)
-- --------------------------------------------------------------------------
-- Perbaikan v2, tahan kesalahan umum:
--   * Langkah 0 memastikan Anda berada di project yang BENAR (project donasi
--     ncoueeeskzslldppsbvx). Kalau salah project, pesan errornya jelas --
--     bukan lagi "relation public.adoption_requests does not exist".
--   * Langkah 1 membuat tabel adoption_requests bila belum ada (skema sama
--     persis dengan ADOPSI-POHON.sql), jadi file ini bisa berdiri sendiri.
--   * Semua langkah idempoten: aman dijalankan berulang kali.
--
-- Masalah yang ditutup file ini:
--   1. Policy lama "FOR ALL USING (true)" di tabel donasi & adoption_requests
--      berlaku untuk SEMUA peran, termasuk anon. Artinya SIAPA PUN di
--      internet bisa membaca semua data (nama + nomor WA pelanggan + kode
--      sertifikat) dan bahkan MENGUBAH / MENGHAPUS baris lewat API Supabase
--      tanpa login sama sekali.
--   2. Kode sertifikat adopsi dulu dicek dengan mengunduh seluruh tabel ke
--      browser pengunjung. Sekarang cukup lewat RPC check_adoption_code()
--      yang hanya menjawab valid/tidak + info paket.
--
-- PRASYARAT (sekali saja, di dashboard Supabase project DONASI
-- ncoueeeskzslldppsbvx):
--   Authentication > Users > Add User > buat user dengan EMAIL & PASSWORD
--   yang sama persis dengan akun admin di project utama.
--   Web akan otomatis login ke dua-duanya saat admin masuk.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. PAGAR: pastikan ini project donasi (tabel donasi harus sudah ada)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.donasi') IS NULL THEN
    RAISE EXCEPTION 'PROJECT SALAH: tabel public.donasi tidak ditemukan. Jalankan file ini di SQL Editor project DONASI (ncoueeeskzslldppsbvx), bukan project utama (pledqkanjduhabruvgxx). Cek nama project di pojok kiri atas dashboard Supabase.';
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 1. Tabel adoption_requests: buat bila belum ada (skema = ADOPSI-POHON.sql)
--    Kalau ADOPSI-POHON.sql sudah pernah dijalankan, langkah ini tidak
--    mengubah apa pun.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adoption_requests (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null check (char_length(customer_name) between 1 and 120),
    package_name text not null,
    amount integer not null check (amount > 0),
    quantity integer not null check (quantity > 0),
    whatsapp text,
    status text not null default 'menunggu_bukti' check (status in ('menunggu_bukti','terverifikasi','ditolak')),
    adoption_code text unique,
    created_at timestamptz not null default now(),
    verified_at timestamptz
);

ALTER TABLE public.adoption_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adoption_requests TO anon, authenticated;

CREATE INDEX IF NOT EXISTS adoption_requests_status_idx ON public.adoption_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS adoption_requests_code_idx ON public.adoption_requests(adoption_code);

-- --------------------------------------------------------------------------
-- 2. RPC publik: cek kode adopsi tanpa membocorkan data pelanggan
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

  -- HANYA info yang dibutuhkan untuk mencetak sertifikat. Nama & nomor WA
  -- pelanggan sengaja tidak disertakan.
  RETURN jsonb_build_object(
    'success', true,
    'code', r.adoption_code,
    'quantity', coalesce(r.quantity, 1),
    'package_name', r.package_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_adoption_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_adoption_code(text) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Tabel donasi: cabut akses tulis & baca penuh dari publik
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "donasi_select_admin" ON public.donasi;
DROP POLICY IF EXISTS "donasi_update_admin" ON public.donasi;
DROP POLICY IF EXISTS "donasi_admin_all"    ON public.donasi;

-- Publik tetap bisa melihat donasi yang SUDAH disetujui (leaderboard)
--   -> policy "donasi_select_public" dari SETUP-DONASI.sql tidak diubah.
-- Publik tetap bisa mengirim donasi baru (status 'baru')
--   -> policy "donasi_insert_public" tidak diubah.

-- Admin (user authenticated) bisa membaca semua, menyetujui, dan menghapus.
-- CATATAN: berlaku untuk SEMUA user authenticated di project ini. Kalau
-- project donasi ini juga dipakai aplikasi lain yang punya user login umum,
-- ganti USING (true) dan WITH CHECK (true) di bawah dengan:
--   USING ((auth.jwt() ->> 'email') = 'email-admin@anda.com')
CREATE POLICY "donasi_admin_all" ON public.donasi
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 4. Tabel adoption_requests: cabut akses baca/ubah/hapus dari publik
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "adoption_select_all"    ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_update_admin"  ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_delete_admin"  ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_admin_all"     ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption_insert_public" ON public.adoption_requests;

-- Publik hanya boleh MENGIRIM pengajuan (insert). Membaca tabel sudah tidak
-- bisa; cek kode sertifikat lewat RPC pada langkah 2.
CREATE POLICY "adoption_insert_public" ON public.adoption_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin (user authenticated) bisa membaca semua, verifikasi, dan menghapus.
-- (Lihat catatan email admin pada langkah 3.)
CREATE POLICY "adoption_admin_all" ON public.adoption_requests
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 5. Uji cepat (opsional)
-- --------------------------------------------------------------------------
-- SELECT public.check_adoption_code('POH-XXXXX');
