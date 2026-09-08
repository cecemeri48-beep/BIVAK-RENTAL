-- =====================================================================
-- BIVAK RENTAL - Data contoh barang rental untuk semua vendor
-- Project Supabase: pledqkanjduhabruvgxx
--
-- Tujuan: mengisi katalog tiap vendor dengan minimal 5 contoh barang
-- beserta foto, agar halaman vendor tidak kosong saat pertama dipasang.
--
-- Prasyarat (sudah dijalankan lebih dulu, berurutan):
--   1. db/BIVAK-FULL-SETUP.sql        (tabel + 6 vendor contoh)
--   2. db/OLSHOP-01-VENDOR-SECURITY.sql
--   3. db/OLSHOP-02-VENDOR-ITEMS.sql  (tabel vendor_items + pagar RLS)
--
-- Foto: file lokal di folder assets/items/ (ikut diunggah ke hosting).
-- Jalankan berulang kali pun AMAN: barang dengan nama yang sama pada
-- vendor yang sama dilewati (ON CONFLICT DO NOTHING), tidak dobel.
--
-- Setelah data contoh masuk, tiap vendor tetap bisa mengubah / menghapus /
-- mengganti foto barangnya sendiri lewat menu "Kelola Barang Toko".
-- =====================================================================

BEGIN;

INSERT INTO public.vendor_items
  (vendor_id, name, category, price_per_day, stock_total, stock_available, photo_url, description)
SELECT v.id, x.item_name, x.category, x.price, x.total, x.ready, x.photo, x.deskripsi
FROM public.vendors v
JOIN (VALUES
  -- ---------------- Celebes Outdoor Rental Makassar (6 barang) ----------------
  ('Celebes Outdoor Rental Makassar','Tenda Dome 4P','tenda',35000,5,4,'assets/items/tenda-dome.jpg','Tenda dome 4 orang, double layer, tahan hujan sedang. Cocok untuk keluarga kecil.'),
  ('Celebes Outdoor Rental Makassar','Carrier 75L','carrier',25000,6,5,'assets/items/carrier.jpg','Carrier 75 liter dengan backsystem nyaman untuk pendakian 3-5 hari.'),
  ('Celebes Outdoor Rental Makassar','Sleeping Bag Polar','sleep',15000,8,8,'assets/items/sleeping-bag.jpg','Sleeping bag polar, hangat sampai suhu 5 derajat, ringkas saat digulung.'),
  ('Celebes Outdoor Rental Makassar','Kompor Portable','cooking',15000,6,6,'assets/items/kompor.jpg','Kompor gas portable, sudah termasuk adaptor kaleng gas.'),
  ('Celebes Outdoor Rental Makassar','Headlamp LED','lighting',10000,10,9,'assets/items/headlamp.jpg','Headlamp LED 300 lumens, baterai tahan 12 jam, tahan cipratan air.'),
  ('Celebes Outdoor Rental Makassar','Lampu Tenda LED','lighting',8000,10,10,'assets/items/lantern.jpg','Lampu tenda LED cahaya hangat, bisa digantung, 3 mode terang.'),

  -- ---------------- Bawakaraeng Adventure Gowa (5 barang) ----------------
  ('Bawakaraeng Adventure Gowa','Tenda Kapasitas 2-6P','tenda',30000,4,3,'assets/items/tenda-dome2.jpg','Tenda ultralight 2-6 orang, frame aluminium, cocok untuk jalur Bawakaraeng.'),
  ('Bawakaraeng Adventure Gowa','Carrier 75L','carrier',25000,5,5,'assets/items/carrier.jpg','Carrier 75L dengan raincover, siap untuk pendakian multi-hari.'),
  ('Bawakaraeng Adventure Gowa','Tracking Pole Carbon','accessories',12000,6,6,'assets/items/poles.jpg','Trekking pole carbon ringan dengan gagang cork, dijual sepasang.'),
  ('Bawakaraeng Adventure Gowa','Nesting Cookset 2-3P','cooking',18000,5,5,'assets/items/cookset.jpg','Cookset nesting aluminium untuk 2-3 orang: panci, wajan, dan tutup.'),
  ('Bawakaraeng Adventure Gowa','Lampu Tenda LED','lighting',8000,10,10,'assets/items/lantern.jpg','Lampu tenda LED cahaya hangat, bisa digantung di dalam tenda.'),

  -- ---------------- Malino Highland Camp Gear (5 barang) ----------------
  ('Malino Highland Camp Gear','Tenda Family Luxury 6P','tenda',50000,3,2,'assets/items/tenda-family.jpg','Tenda keluarga 6 orang dengan dua ruang, nyaman untuk camping keluarga di Malino.'),
  ('Malino Highland Camp Gear','Matras Thermal Foil','sleep',10000,8,8,'assets/items/matras.jpg','Matras foam thermal berlapis foil, empuk dan menahan dingin tanah.'),
  ('Malino Highland Camp Gear','Hammock Double','accessories',15000,5,5,'assets/items/hammock.jpg','Hammock parasut double lengkap dengan tali webbing, muat 2 orang.'),
  ('Malino Highland Camp Gear','Grill Barbeque Portable','cooking',20000,4,4,'assets/items/grill.jpg','Grill BBQ lipat stainless, cocok untuk bakar-bakar di camping ground.'),
  ('Malino Highland Camp Gear','Sleeping Bag Polar','sleep',15000,6,6,'assets/items/sleeping-bag.jpg','Sleeping bag polar, nyaman untuk suhu dingin dataran tinggi Malino.'),

  -- ---------------- Rammang-Rammang Outdoor Maros (5 barang) ----------------
  ('Rammang-Rammang Outdoor Maros','Tenda Glamping 4P','tenda',45000,3,3,'assets/items/tenda-glamping.jpg','Tenda glamping canvas 4 orang, cocok untuk camping santai di Rammang-Rammang.'),
  ('Rammang-Rammang Outdoor Maros','Life Jacket Water Sport','apparel',10000,12,12,'assets/items/life-jacket.jpg','Life jacket standar water sport, ukuran all size, wajib untuk susur sungai.'),
  ('Rammang-Rammang Outdoor Maros','Kompor Ultralight','cooking',15000,5,5,'assets/items/kompor.jpg','Kompor ultralight untuk masak cepat di tepi sungai atau bukit.'),
  ('Rammang-Rammang Outdoor Maros','Headlamp Waterproof','lighting',10000,8,8,'assets/items/headlamp.jpg','Headlamp LED tahan air, aman untuk susur gua dan perahu.'),
  ('Rammang-Rammang Outdoor Maros','Carrier 45L','carrier',20000,4,3,'assets/items/carrier.jpg','Carrier 45L ringkas untuk trip 1-2 hari.'),

  -- ---------------- Toraja Highland Explorer (5 barang) ----------------
  ('Toraja Highland Explorer','Sepatu Tracking Waterproof','apparel',25000,7,6,'assets/items/sepatu.jpg','Sepatu tracking waterproof ukuran 39-44, grip kuat untuk jalur Toraja.'),
  ('Toraja Highland Explorer','Jaket Windproof','apparel',20000,8,8,'assets/items/jaket.jpg','Jaket windproof dan water resistant, hangat untuk angin pegunungan.'),
  ('Toraja Highland Explorer','Carrier 60L','carrier',25000,5,5,'assets/items/carrier.jpg','Carrier 60L dengan raincover untuk pendakian 2-3 hari.'),
  ('Toraja Highland Explorer','GPS Navigation','accessories',30000,3,3,'assets/items/gps.jpg','GPS handheld berisi peta topografi Sulawesi Selatan.'),
  ('Toraja Highland Explorer','Tracking Pole Carbon','accessories',12000,6,5,'assets/items/poles.jpg','Trekking pole carbon ringan dengan gagang cork, sepasang.'),

  -- ---------------- Palopo Camp & Trail Base (5 barang) ----------------
  ('Palopo Camp & Trail Base','Tenda Dome 4P','tenda',30000,4,4,'assets/items/tenda-dome.jpg','Tenda dome 4 orang, double layer, cepat dipasang.'),
  ('Palopo Camp & Trail Base','Sleeping Bag Polar','sleep',15000,6,6,'assets/items/sleeping-bag.jpg','Sleeping bag polar, hangat dan ringkas dibawa.'),
  ('Palopo Camp & Trail Base','Kompor Mawar Windproof','cooking',15000,5,5,'assets/items/kompor.jpg','Kompor mawar windproof, api stabil di area berangin.'),
  ('Palopo Camp & Trail Base','Botol Tumbler Thermal 1L','accessories',8000,10,10,'assets/items/botol.jpg','Botol thermal 1 liter, air tetap panas sampai 12 jam.'),
  ('Palopo Camp & Trail Base','Lampu Tenda LED','lighting',8000,8,8,'assets/items/lantern.jpg','Lampu tenda LED cahaya hangat dengan 3 mode terang.')
) AS x(vendor_name, item_name, category, price, total, ready, photo, deskripsi)
  ON v.name = x.vendor_name
ON CONFLICT DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------
-- Verifikasi: tiap vendor harus punya minimal 5 barang.
-- Baris pada hasil kedua (vendor tanpa barang) harus KOSONG.
-- Kalau ada vendor yang muncul di hasil kedua, nama vendor di database
-- tidak sama persis dengan nama pada skrip ini - perbaiki lalu ulangi.
-- ---------------------------------------------------------------------
SELECT v.name AS vendor, COUNT(i.id) AS jumlah_barang, MIN(i.price_per_day) AS sewa_termurah
FROM public.vendors v
LEFT JOIN public.vendor_items i ON i.vendor_id = v.id AND i.status <> 'archived'
WHERE v.status = 'approved'
GROUP BY v.name
ORDER BY v.name;

SELECT v.name AS vendor_tanpa_barang
FROM public.vendors v
LEFT JOIN public.vendor_items i ON i.vendor_id = v.id AND i.status <> 'archived'
WHERE v.status = 'approved'
GROUP BY v.name
HAVING COUNT(i.id) < 5;
