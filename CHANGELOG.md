# Changelog

Satu file changelog untuk seluruh proyek. Sebelumnya ada 4 file changelog
terpisah + 4 file catatan lepas yang saling bertentangan; semuanya digabung
ke sini.

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
