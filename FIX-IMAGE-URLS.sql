-- =============================================
-- FIX: Repair vendor image URLs
-- =============================================

-- Fix typo: htps:// -> https://
UPDATE public.vendors 
SET image_url = REPLACE(image_url, 'htps://', 'https://')
WHERE image_url LIKE 'htps://%';

-- Verify fix
SELECT name, city, image_url FROM public.vendors ORDER BY id;
