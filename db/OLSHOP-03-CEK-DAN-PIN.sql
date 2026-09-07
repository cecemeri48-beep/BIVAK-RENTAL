-- =====================================================================
-- BIVAK RENTAL - Pemeriksaan & pengelolaan PIN toko
-- Jalankan SETELAH 01 dan 02. Berisi query bantu, bukan perubahan wajib.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pastikan policy lama yang berbahaya sudah tidak ada.
--    Harus TIDAK ADA baris bernama vendor_items_all_anon.
-- ---------------------------------------------------------------------
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('vendor_items', 'vendors')
ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------
-- 2. Pastikan kolom PIN plaintext sudah hilang (harus 0 baris)
-- ---------------------------------------------------------------------
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'edit_pin';

-- ---------------------------------------------------------------------
-- 3. Vendor mana yang sudah punya PIN toko
-- ---------------------------------------------------------------------
SELECT v.name,
       v.city,
       v.status,
       v.is_verified,
       (s.vendor_id IS NOT NULL) AS punya_pin,
       s.failed_count,
       s.locked_until
FROM public.vendors v
LEFT JOIN public.vendor_secrets s ON s.vendor_id = v.id
ORDER BY v.name;

-- ---------------------------------------------------------------------
-- 4. Berapa barang per vendor
-- ---------------------------------------------------------------------
SELECT v.name,
       count(i.id) AS jenis_barang,
       coalesce(sum(i.stock_total), 0) AS total_unit,
       coalesce(sum(i.stock_available), 0) AS unit_siap,
       min(i.price_per_day) AS harga_termurah
FROM public.vendors v
LEFT JOIN public.vendor_items i ON i.vendor_id = v.id
GROUP BY v.name
ORDER BY jenis_barang DESC, v.name;

-- ---------------------------------------------------------------------
-- 5. Beri PIN baru ke satu vendor (PIN acak, TAMPIL SEKALI - catat!)
--    Ganti kata kuncinya sesuai nama toko.
-- ---------------------------------------------------------------------
-- SELECT v.name, public.admin_vendor_reset_pin(v.id) AS pin_baru
-- FROM public.vendors v
-- WHERE v.name ILIKE '%celebes outdoor%';

-- ---------------------------------------------------------------------
-- 6. Tetapkan PIN sendiri (6 angka)
-- ---------------------------------------------------------------------
-- SELECT public.admin_vendor_set_pin(
--   (SELECT id FROM public.vendors WHERE name ILIKE '%celebes outdoor%'),
--   '123456'
-- );

-- ---------------------------------------------------------------------
-- 7. Buka kunci vendor yang salah PIN 5x
-- ---------------------------------------------------------------------
-- UPDATE public.vendor_secrets
-- SET failed_count = 0, locked_until = NULL, updated_at = now()
-- WHERE vendor_id = (SELECT id FROM public.vendors WHERE name ILIKE '%celebes outdoor%');

-- ---------------------------------------------------------------------
-- 8. Bersihkan sesi kedaluwarsa (aman dijalankan kapan saja)
-- ---------------------------------------------------------------------
DELETE FROM public.vendor_sessions WHERE expires_at < now();

-- ---------------------------------------------------------------------
-- 9. OPSIONAL: hapus barang contoh bawaan skrip lama (foto dari unsplash)
--    Jalankan hanya bila katalog masih berisi data contoh.
-- ---------------------------------------------------------------------
-- DELETE FROM public.vendor_items WHERE photo_url ILIKE '%unsplash%';
