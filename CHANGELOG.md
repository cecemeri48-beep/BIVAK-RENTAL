# Changelog

Satu file changelog untuk seluruh proyek. Sebelumnya ada 4 file changelog
terpisah + 4 file catatan lepas yang saling bertentangan; semuanya digabung
ke sini.

## 2026-09-11
### Optimasi mobile (tetap menarik, lebih ringan dibuka)

- **Shader hero WebGL dibuat sadar-perangkat.** Di HP (layar kecil / layar
  sentuh) aurora kini dirender pada 60% resolusi lalu di-upscale CSS (gradasi
  tetap mulus), DPR dibatasi 1, dan animasi dibatasi ~30 fps — hemat GPU dan
  baterai tanpa mengubah tampilan. Mode hemat data (Save-Data) mendapat satu
  frame statis. Listener parallax kursor dilewati di layar sentuh. Desktop
  tidak berubah.
- **Section berat di bawah lipatan** (donasi, adopsi, dampak) memakai
  `content-visibility: auto` di HP: tidak digambar sebelum hampir terlihat.
- **`preconnect` + `dns-prefetch`** untuk CDN (cdnjs, jsdelivr) dan kedua
  host Supabase — memangkas waktu jabat tangan jaringan seluler.
- Foto dicek ulang: ternyata sudah terkompresi optimal (q80, varian `@600`
  untuk HP + `loading="lazy"`), jadi tidak perlu diubah.


### Perbaikan bug kritis (audit keamanan & fungsionalitas)

- **KRITIS — eskalasi admin lewat wildcard ILIKE.** `checkAdminUser` memakai
  email mentah sebagai pola `ilike`. Karakter `%`/`_` di email menjadi
  wildcard sehingga akun non-admin bisa ikut cocok dengan email admin di
  tabel `admins`. Email sekarang di-escape dulu sebelum dipakai sebagai pola.
- **KRITIS — tabel `adoption_requests` & `donasi` terbuka untuk publik.**
  Policy lama `FOR ALL USING (true)` berlaku juga untuk anon: siapa pun bisa
  membaca nama + nomor WA pelanggan dan kode sertifikat, bahkan mengubah /
  menghapus baris lewat API. Web tidak lagi mengunduh tabel adopsi untuk
  pengunjung (hanya admin); cek kode sertifikat pindah ke RPC
  `check_adoption_code` yang hanya menjawab valid/tidak + info paket
  (fallback hemat-data tetap ada untuk masa transisi). Jalankan
  `db/ADOPSI-06-AMANKAN-ADOPSI.sql` di project donasi untuk menutup celahnya
  di sisi server — lihat prasyarat di dalam file.
- **KRITIS — stored XSS di panel admin lewat kolom "gears".** Daftar alat
  dari form pendaftaran vendor dirender ke tabel admin tanpa escape, jadi
  pendaftar bisa menyimpan script yang berjalan di sesi admin. Sekarang
  setiap item di-escape (dua lokasi render).
- **Aksi admin donasi/adopsi dipagari `isAdmin`** di sisi klien, dan login
  admin kini sekaligus masuk ke database donasi (logout juga membersihkan
  sesi donasi).
- **Badge notifikasi donasi tidak pernah diperbarui.** `syncDonasiBadge()`
  hanya tercantol pada fungsi yang tidak pernah dipanggil; sekarang dipanggil
  setiap data publik dimuat.
- **Upload foto barang vendor tanpa validasi** (berbeda dengan upload
  pengajuan vendor). Sekarang dibatasi 5 MB dan hanya JPG/PNG/WEBP/GIF.
- **Total donasi bisa tampil NaN** bila ada baris tanpa nominal; dijaga
  dengan fallback 0.
- Cache-busting `?v=` untuk `app.js`, `supabase-data.js`, `vendor-shop.js`
  dinaikkan ke `20260911-01`.


## 2026-08-22

### Sertifikat adopsi pohon

- **Logo `RC` diganti aset asli.** Sebelumnya sertifikat hanya menulis teks
  `RC` dengan `fillText`. File `assets/1.jpeg` sekarang dipakai sebagai
  emblem (`assets/cert-emblem.jpg`, 560x560, 59 KB), digambar di dalam
  lingkaran dengan cincin emas.
- **Bug: logo tidak pernah muncul.** Kode lama memuat `assets/logo.png` ke
  variabel `_certLogo` tapi tidak pernah menggambarnya, dan `updateCertPreview`
  memanggil fungsi gambar tanpa menunggu gambar selesai dimuat. Sekarang
  render menunggu emblem lalu menggambar ulang.
- **Bug: label tanda tangan kanan menimpa garisnya sendiri.** Kolom kiri
  memakai `sigY+50 / sigY+80`, kolom kanan memakai `sigY / sigY+30`. Kedua
  kolom kini memakai baseline yang sama.
- **Bug: segel menempel ke baris nomor sertifikat.** Segel berakhir tepat di
  posisi teks footer. Tata letak baru: segel selesai di y=1118, garis tanda
  tangan di y=1178, footer di y=1348.
- **Bug: nama panjang menembus bingkai.** Ukuran font nama sekarang menyusut
  otomatis sampai teks pasti masuk.
- **Desain dibuat lebih mewah:** latar guilloche (garis diagonal halus + pita
  sinus), vignette, watermark pohon, bingkai emas tiga lapis, ornamen sudut,
  judul dengan gradien emas, garis hias di bawah nama, dan segel lilin emas
  bergerigi 26 titik dengan pita.
- **Unduhan lebih tajam:** file PNG dirender di canvas 2400x1697 terpisah,
  sementara preview di halaman hanya 1400x990.
- **Kode dipindah ke `cert.js`.** Semua koordinat memakai ruang desain
  2000x1414 lalu diskalakan, jadi preview dan hasil unduhan selalu identik.

### Tampilan HP

- Font `input`/`select`/`textarea` dinaikkan ke 16px di layar kecil. Di bawah
  16px, iOS Safari memperbesar halaman otomatis saat kolom difokuskan.
- Scroll body dikunci saat modal atau menu terbuka. Sebelumnya latar belakang
  ikut menggulir di belakang modal.
- Menu HP mendapat backdrop gelap yang bisa diketuk untuk menutup.
- Target sentuh minimum 44px untuk `.btn`, `.tab-btn`, `.tier-btn`,
  `.modal-close`, dan tombol menu.
- `Rp 47.500.000` sebelumnya meluber keluar kolom statistik pada layar 360px;
  ukuran font dan pembungkusan kata diperbaiki.
- `100vh` diganti `100dvh` supaya konten tidak terpotong toolbar browser HP.
- Canvas sertifikat diturunkan dari 2000x1414 (11 MB memori) ke 1400x990.
- Sertifikat bisa diketuk untuk melihat versi besar yang dapat digeser, karena
  teksnya tidak terbaca pada lebar layar HP.
- Semua `<img>` diberi `width`/`height` eksplisit agar layout tidak bergeser
  saat gambar selesai dimuat.
- Ditambahkan `theme-color`, `viewport-fit=cover`, dan safe-area inset untuk
  navbar/footer.

### Foto vendor

- Sebelumnya 6 vendor hanya memakai 3 gambar: `gear-tent.png` dipakai vendor
  1, 4, dan 5; `gear-carrier.png` untuk vendor 2 dan 6; vendor 3 memakai
  `hero-bg.png` yang sebenarnya gambar latar.
- Sekarang tiap vendor punya fotonya sendiri, masing-masing dua ukuran
  (1200px dan 600px) dan disajikan lewat `srcset` + `loading="lazy"`.
- Gambar cadangan yang jelas: `assets/gear-fallback.jpg`.

### Kebersihan kode

- Dihapus: `supabase-data-v2.js`, `supabase-data-v3.js` (isinya identik dengan
  v2), `patch-all.js`, `patch-render.js`, `patch-supabase.js`, `fix-donasi.js`,
  `fix-donasi2.js`, `fix-donasi3.js`, `fix-medals.py`, dan folder `handoffs/`.
- Dihapus fungsi yang tidak pernah dipanggil: `_rr`, `_wrap`, `_pine`,
  `_seal`, `drawAdopsiCertToCanvas`, `buildAdopsiCert`, `_certNo`,
  `_certNoName`.
- 16 baris `console.log` sisa debugging dihapus.
- Komentar `Cloned from Pintu Angin` dihapus.
- 17 file `.sql` yang berserakan di root dipindah ke `db/`.
- `supabase-data.js` menyusut dari 1363 ke 992 baris.

### Data yang jujur

- Statistik jumlah vendor dan total donasi tidak lagi di-hardcode `48+` dan
  `47.500.000`; keduanya dihitung dari data sebenarnya.
- Daftar 5 donatur palsu (Andi Mappanyukki, Komunitas Pencinta Alam Makassar,
  dan lainnya) dihapus, diganti keadaan kosong yang wajar.
- 7 `alert()` diganti sistem `toast()` yang sudah ada.
- Emoji medali yang rusak encoding (`??`) diperbaiki.

### Aset

- Enam file berekstensi `.png` sebenarnya berisi data JPEG. Semuanya
  dikonversi ke `.jpg` yang benar: `hero-bg.jpg` (975 KB -> 356 KB),
  `logo.jpg` (10 KB), `coin.jpg` (14 KB).

## Belum dikerjakan

- **Login admin tanpa password.** `supabase-config.js` menyatakan admin bisa
  masuk hanya dengan memasukkan email. Ini perlu autentikasi Supabase yang
  sebenarnya plus Row Level Security, dan sebaiknya diputuskan olehmu dulu
  karena mengubah alur login.

## 2026-09-07 — Katalog barang vendor (dipasang di versi mobile)

Ditambahkan ke versi mobile tanpa mengubah tampilan/perbaikan yang sudah ada (adopsi pohon, tata letak vertical, `styles.css`, `supabase-data.js` tidak disentuh).

### Berkas baru

- `vendor-shop.js` — katalog barang per vendor + dashboard kelola barang untuk vendor (login PIN).
- `vendor-shop.css` — gaya mandiri untuk katalog (mobile-first, satu kolom di layar sempit).
- `admin-pin.js` — PIN toko dibuat & ditampilkan langsung di Panel Admin, lengkap tombol kirim WhatsApp.
- `db/OLSHOP-01-VENDOR-SECURITY.sql` — login toko berbasis PIN (hash bcrypt), sesi, kunci setelah 5x salah.
- `db/OLSHOP-02-VENDOR-ITEMS.sql` — tabel `vendor_items` + RPC tambah/ubah/hapus barang & atur jumlah unit.
- `db/OLSHOP-03-CEK-DAN-PIN.sql` — kueri pemeriksaan (opsional).
- `db/OLSHOP-04-ADMIN-PIN.sql` — RPC PIN untuk Panel Admin.
- `KATALOG-VENDOR.md` — panduan pemakaian.

### `app.js`

- Daftar vendor & pengajuan tidak lagi di-cache di `localStorage` (dulu bikin data basi); hanya donasi yang masih disimpan lokal.
- Semua `console.log('[DEBUG] ...')` dan `alert('Fungsi handleVendorSubmit TERPANGGIL!...')` dibuang.
- Kartu vendor kini memuat penanda `data-vendor-id` dan wadah `mini-items-grid`: menampilkan barang asli (nama, harga sewa/hari, jumlah unit) sebagai ganti daftar tag.
- Tombol kartu jadi **Barang** (ikon kotak) dan membuka daftar barang vendor.
- `openVendorDetail` versi lama dihapus, digantikan versi `vendor-shop.js` yang menampilkan katalog nyata.

### `index.html`

- Memuat `vendor-shop.css`, `vendor-shop.js`, `admin-pin.js`.
- Modal baru **Kelola Barang Toko**: masuk pakai nama toko + PIN 6 angka, lalu tambah/ubah/hapus barang dan atur jumlah unit siap disewa.
- Tombol ikon toko di footer + tautan *Kelola Barang Toko (Vendor)*.
- Catatan platform: BIVAK RENTAL hanya mempertemukan penyewa dan vendor — transaksi langsung dengan pihak vendor, tanpa perantaraan BIVAK RENTAL.

### Sengaja TIDAK dibuat

Keranjang, pemesanan, jadwal sewa, pengiriman, dan pembayaran. Sesuai konsep: web hanya memperlihatkan barang milik tiap vendor beserta jumlah dan harga sewanya.

## 2026-09-07 (lanjutan) - Perbaikan pesan error pgcrypto, tampilan vertical & menu vendor

### Perbaikan bug: "Fitur Belum Dipasang" padahal SQL sudah dijalankan

- Sebab: fungsi dibuat dengan `SET search_path = public`, tetapi `pgcrypto` (`crypt`, `gen_salt`) berada di skema `extensions` di Supabase. Error aslinya `function crypt(text, text) does not exist`, dan deteksi di web menangkap kata "does not exist" lalu salah menuduh SQL belum dijalankan.
- `db/OLSHOP-05-PERBAIKI-CRYPT.sql` (baru): menambahkan `extensions` ke `search_path` semua fungsi `vendor_shop_*` / `admin_vendor_*` tanpa mengubah isinya, menyegarkan cache skema PostgREST, lalu menampilkan hasil pemeriksaan.
- `db/OLSHOP-01`, `02`, `04`: `SET search_path = public` -> `SET search_path = public, extensions, pg_temp` (14 fungsi), dan pemasangan `pgcrypto` di SQL 01 dibuat aman untuk Supabase maupun non-Supabase.
- `admin-pin.js`: error dipisahkan menjadi empat kasus jelas - pgcrypto belum terbaca, RPC benar-benar tidak ada (`PGRST202`), bukan admin, dan pesan asli server beserta kodenya. Error juga dicatat ke console.
- `vendor-shop.js`: `missingFn()` tidak lagi menganggap error pgcrypto sebagai "SQL belum dijalankan"; ditambah `serverErr()` yang memberi pesan sesuai sebab pada login toko, pemuatan barang, dan penyimpanan barang.

### Menu "Kelola Barang Toko" dinaikkan ke atas

- `index.html`: tautan hijau **Kelola Barang Toko** di navigasi atas (ikut tampil di menu geser HP) dan tombol **Kelola Barang Toko** di menu geser, sejajar "Pasang Iklan Vendor". Tautan footer tetap ada.

### Perbaikan tampilan layar vertical (portrait)

- `mobile-fix.css` (baru, dimuat paling akhir): `.grid-2col` di dalam kartu form jadi satu kolom; label pindah ke atas kolom isian (sebelumnya `.input-group` memakai flex baris sehingga label dan kotak isian berdesakan); tinggi isian minimal 48px dan font 16px; tombol form adopsi bertumpuk penuh; kartu paket adopsi satu per baris di bawah 420px.
- `styles.css` sengaja TIDAK diubah - perbaikan ditumpuk lewat berkas terpisah.

## 2026-09-08

### Data contoh barang vendor

- `db/SEED-CONTOH-BARANG.sql` (baru): 31 contoh barang rental untuk 6 vendor, tiap vendor minimal 5 barang, lengkap dengan harga sewa, stok, kategori, dan deskripsi. Idempoten (`ON CONFLICT DO NOTHING`) plus dua query verifikasi.
- `assets/items/` (baru): 19 foto contoh barang (tenda, carrier, sleeping bag, kompor, headlamp, lampu tenda, cookset, matras, hammock, grill, life jacket, sepatu, jaket, tracking pole, GPS, botol thermal), JPEG 800px.
- `KATALOG-VENDOR.md`: tambah bagian cara menjalankan data contoh.

### Perbaikan tampilan & stabilitas daftar vendor (2026-09-08 lanjutan)

- `vendor-shop.css`: tambah aturan yang hilang untuk kartu barang modal detail — `.gear-item-thumb img` dibatasi mengisi kotak 78/92px (sebelumnya foto tampil sebesar ukuran aslinya sehingga kartu "kacau"), badge stok diposisikan absolut di atas foto, dan label/nilai `.gear-item-facts` diberi gaya terpisah (sebelumnya menempel: "Jumlah5 unit").
- `vendor-shop.js`: label stok habis di badge foto "Sedang kosong" -> "Kosong" (muat di thumbnail 78px, konsisten dengan cuplikan mini).
- `supabase-data.js`: daftar vendor tidak lagi dikosongkan saat fetch gagal (dulu `vendorsData = []` memunculkan status "Tidak Ada Vendor" palsu di HP dengan sinyal lemah); daftar dimulai dari data statis bawaan sebagai cadangan dan hanya diganti saat fetch Supabase berhasil.
- `index.html`: cache-bust `vendor-shop.css`, `vendor-shop.js`, `supabase-data.js` -> `?v=20260908-01`.

### Repo dirapikan (2026-09-08 malam)

- Hapus 24 SQL duplikat di root (semua sudah ada di `db/`), termasuk `FIX-VENDOR-ITEMS.sql` lama yang berbahaya bila dijalankan ulang.
- Hapus `supabase-data-v2.js` dan `supabase-data-v3.js` (kembaran `supabase-data.js`, tidak dipakai).
- Hapus `PATCH-NOTES.md` dan `PERBAIKAN-VENDOR.md` (catatan patch lama; isinya sudah tercakup di CHANGELOG ini).
- Hapus `assets/1.jpeg` dan `assets/hero-bg.jpg` (tidak lagi dirujuk kode mana pun).
- `db/` dipangkas dari 28 -> 12 skrip: hanya jalur resmi (FULL-SETUP, SETUP-DONASI, ADOPSI-POHON, FIX-VENDOR-APPROVAL, FIX-VENDOR-IMAGES, OLSHOP-01..05, ADD-ADMIN-EMAIL, SEED-CONTOH-BARANG).
- `.gitignore`: `*.sql` -> `/*.sql` + `!db/**/*.sql` (duplikat root diabaikan, skrip resmi di `db/` tetap dilacak git).
- Total file 116 -> 67.
