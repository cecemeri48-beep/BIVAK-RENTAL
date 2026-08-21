-- ============================================================
-- Tambahkan 2 Admin BIVAK
-- Email: upik.zulkiflie@gmail.com
-- Email: cecemeri48@gmail.com
-- ============================================================

-- ============================================================
-- STEP 1: Insert ke tabel admins ( jalankan SETELAH sign up )
-- ============================================================

-- Admin 1: upik.zulkiflie@gmail.com
INSERT INTO public.admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'upik.zulkiflie@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Admin 2: cecemeri48@gmail.com
INSERT INTO public.admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'cecemeri48@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- STEP 2: Verifikasi
-- ============================================================
SELECT id, email, created_at
FROM public.admins;
