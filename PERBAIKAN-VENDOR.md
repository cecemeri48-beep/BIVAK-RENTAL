# Perbaikan alur daftar dan approval vendor

## Masalah yang ditemukan

1. Badge antrean admin mengambil jumlah dari `localStorage`, sedangkan tabel admin mengambil data Supabase. Akibatnya pengajuan terlihat tetapi badge tetap `0`.
2. Data vendor Supabase tidak disinkronkan ke `BIVAK.vendors`, padahal beranda, filter, dan detail membaca array tersebut. Akibatnya vendor yang disetujui tidak konsisten muncul di beranda.
3. Update approval tidak memeriksa jumlah baris yang benar-benar berubah. RLS dapat menolak update tanpa membuat alur lama menampilkan pesan yang jelas.
4. Sesi admin tidak dipulihkan saat halaman dimuat ulang dan tombol Keluar tidak melakukan sign-out Supabase.
5. Baris admin yang hanya berisi email dapat lolos pemeriksaan UI, tetapi gagal pada RLS jika `user_id` belum terhubung ke akun Auth.

## Yang sudah diperbaiki

- State vendor publik, antrean, badge, filter, dan detail disinkronkan dengan Supabase.
- Approval diverifikasi memakai hasil `UPDATE ... RETURNING`; aplikasi tidak lagi menampilkan sukses palsu jika tidak ada baris berubah.
- Sesi admin dipulihkan dan logout memutus sesi Supabase.
- Properti `verified` dipetakan dengan benar untuk kartu vendor.
- Ditambahkan migrasi aman `db/FIX-VENDOR-APPROVAL.sql`.
- Pendaftaran baru dipaksa masuk status `pending` oleh trigger database.
- Vendor publik wajib `approved` sekaligus `is_verified = true`.
- Baris yang telanjur `approved` tanpa verifikasi dikembalikan ke antrean.
- Approval kini memiliki jejak eksplisit pada kolom `approved_at`; tanpa nilai
  tersebut vendor tidak dapat tampil sebagai aktif atau masuk katalog.
- Logo dan kolase sekarang diunggah ke bucket Supabase Storage `vendor-images`,
  lalu URL asli disimpan pada `logo_url` dan `collage_url`.
- Jika Storage atau kolom gambar belum siap, form memakai fallback gambar
  terkompresi agar pengajuan tetap masuk antrean dan modal dapat ditutup.

## Cara menerapkan

1. Buka project Supabase utama yang dipakai oleh `supabase-config.js`, yaitu
   project ref **`pledqkanjduhabruvgxx`**. Jangan mengikuti komentar project
   lama `sqxwhfdarnzypicoamzl` karena website tidak terhubung ke sana.
2. Buka **SQL Editor**.
3. Salin dan jalankan seluruh isi `db/FIX-VENDOR-APPROVAL.sql` satu kali.
4. Jalankan juga `db/FIX-VENDOR-IMAGES.sql` satu kali.
5. Deploy ulang semua file website dari paket ini.
6. Hard refresh browser (`Ctrl+Shift+R`), login admin, kirim satu vendor uji, lalu approve.

Setelah approval, jumlah antrean harus berkurang, jumlah vendor aktif bertambah, dan kartu vendor langsung tampil di beranda.
