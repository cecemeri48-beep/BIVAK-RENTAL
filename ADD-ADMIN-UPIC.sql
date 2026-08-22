-- ============================================================
-- Tambahkan Admin: upik.zulkiflie@gmail.com
-- ============================================================
-- 1. Cari user_id dari auth.users
-- ============================================================
SELECT id, email, created_at
FROM auth.users
WHERE email = 'upik.zulkiflie@gmail.com';

-- 2. Masukkan ke tabel admins (ganti UUID di bawah dengan hasil query no.1)
INSERT INTO public.admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'upik.zulkiflie@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verifikasi
SELECT * FROM public.admins;
