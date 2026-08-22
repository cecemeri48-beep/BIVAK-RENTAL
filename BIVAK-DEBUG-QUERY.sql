-- =============================================
-- DEBUG BIVAK v5 — cek isi tabel & error log
-- =============================================

-- 1. Cek admins
SELECT '=== ADMINS ===' AS info;
SELECT id, email, created_at FROM public.admins ORDER BY id;

-- 2. Cek vendors
SELECT '=== VENDORS ===' AS info;
SELECT id, name, city, status, image_url, created_at 
FROM public.vendors 
ORDER BY created_at DESC;

-- 3. Cek cities
SELECT '=== CITIES ===' AS info;
SELECT id, name FROM public.cities ORDER BY id;

-- 4. Cek enum type
SELECT '=== ENUM VALUES ===' AS info;
SELECT enum_range(NULL::vendor_status_type);

-- 5. Test query vendor seakan-akan user public (anon)
SELECT '=== TEST VENDOR QUERY ===' AS info;
SELECT count(*) AS vendor_approved FROM public.vendors WHERE status = 'approved';

-- 6. Cek konfigurasi site_settings
SELECT '=== SITE SETTINGS ===' AS info;
SELECT * FROM public.site_settings;
