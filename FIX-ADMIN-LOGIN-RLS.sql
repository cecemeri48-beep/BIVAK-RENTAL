-- FIX: RLS policy untuk admin email-only login
-- Masalah: Policy lama "Admin Read Admins" hanya mengizinkan role authenticated,
--           tapi supabase-data.js menggunakan anonymous key untuk query email admin.
-- Solusi: Ganti policy agar anonymous juga bisa SELECT dari tabel admins.

-- Hapus policy lama
DROP POLICY IF EXISTS "Admin Read Admins" ON public.admins;

-- Tambah policy baru: anonymous + authenticated bisa baca semua baris
CREATE POLICY "Public Read Admins Email"
ON public.admins FOR SELECT
TO anon, authenticated
USING (true);

-- Verifikasi
SELECT pol.polname, pol.polallroles, pol.polcmd
FROM pg_policy pol
WHERE pol.relname = 'admins';
