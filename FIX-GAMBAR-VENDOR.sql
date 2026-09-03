-- ============================================================
-- FIX GAMBAR VENDOR BIVAK
-- Jalankan di Supabase SQL Editor project baru
-- Mengganti image_url vendor ke asset lokal yang ada di website
-- ============================================================

UPDATE public.vendors SET image_url = CASE
  WHEN lower(city) LIKE '%makassar%' THEN 'assets/vendor-makassar.jpg'
  WHEN lower(city) LIKE '%gowa%' OR lower(city) LIKE '%sungguminasa%' THEN 'assets/vendor-gowa.jpg'
  WHEN lower(city) LIKE '%malino%' THEN 'assets/vendor-malino.jpg'
  WHEN lower(city) LIKE '%maros%' OR lower(name) LIKE '%rammang%' THEN 'assets/vendor-maros.jpg'
  WHEN lower(city) LIKE '%toraja%' OR lower(city) LIKE '%rantepao%' THEN 'assets/vendor-toraja.jpg'
  WHEN lower(city) LIKE '%palopo%' OR lower(city) LIKE '%luwu%' THEN 'assets/vendor-palopo.jpg'
  ELSE 'assets/gear-fallback.jpg'
END
WHERE image_url IS NULL
   OR image_url = ''
   OR image_url LIKE '<%'
   OR image_url LIKE '%>'
   OR image_url LIKE '%unsplash.com%';

-- Pastikan seed 6 vendor utama punya gambar pasti
UPDATE public.vendors SET image_url = 'assets/vendor-makassar.jpg' WHERE name ILIKE '%Celebes Outdoor%';
UPDATE public.vendors SET image_url = 'assets/vendor-gowa.jpg' WHERE name ILIKE '%Bawakaraeng%';
UPDATE public.vendors SET image_url = 'assets/vendor-malino.jpg' WHERE name ILIKE '%Malino Highland%';
UPDATE public.vendors SET image_url = 'assets/vendor-maros.jpg' WHERE name ILIKE '%Rammang%';
UPDATE public.vendors SET image_url = 'assets/vendor-toraja.jpg' WHERE name ILIKE '%Toraja%';
UPDATE public.vendors SET image_url = 'assets/vendor-palopo.jpg' WHERE name ILIKE '%Palopo%';

SELECT name, city, image_url FROM public.vendors ORDER BY created_at DESC;
