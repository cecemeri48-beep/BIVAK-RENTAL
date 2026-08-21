-- ============================================================
-- FIX: RLS Policy untuk Donasi BIVAK
-- Database: Pintu Angin (ncoueeeskzslldppsbvx)
-- ============================================================
-- Masalah: Admin BIVAK tidak bisa lihat donasi karena RLS policy
--          hanya mengizinkan role authenticated, tapi BIVAK pakai
--          anonymous key untuk query database Pintu Angin.
-- Solusi: Ubah policy agar anon bisa SELECT semua donasi.
-- ============================================================

-- 1. Drop policy lama
DROP POLICY IF EXISTS "donasi_select_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_select_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_update_admin"  ON public.donasi;
DROP POLICY IF EXISTS "donasi_delete_admin"  ON public.donasi;

-- 2. Buat policy baru: anonymous bisa baca semua (untuk admin BIVAK)
CREATE POLICY "donasi_select_all" ON public.donasi
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Policy untuk insert (publik bisa donasi)
CREATE POLICY "donasi_insert" ON public.donasi
  FOR INSERT TO anon, authenticated
  WITH CHECK (astatus = 'baru');

-- 4. Policy untuk update (admin bisa approve/reject)
CREATE POLICY "donasi_update" ON public.donasi
  FOR UPDATE TO anon, authenticated
  USING (true);

-- 5. Policy untuk delete (admin bisa hapus)
CREATE POLICY "donasi_delete" ON public.donasi
  FOR DELETE TO anon, authenticated
  USING (true);

-- 6. Verifikasi
SELECT polname, polcmd, polroles::text
FROM pg_policy
WHERE polrelid = 'public.donasi'::regclass;

-- 7. Test query (harus return data)
SELECT id, nama, amt, astatus, created_at
FROM public.donasi
ORDER BY created_at DESC
LIMIT 10;
