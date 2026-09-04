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

## Cara menerapkan

1. Buka project Supabase utama yang dipakai oleh `supabase-config.js`.
2. Buka **SQL Editor**.
3. Salin dan jalankan seluruh isi `db/FIX-VENDOR-APPROVAL.sql` satu kali.
4. Deploy ulang semua file website dari paket ini.
5. Hard refresh browser (`Ctrl+Shift+R`), login admin, kirim satu vendor uji, lalu approve.

Setelah approval, jumlah antrean harus berkurang, jumlah vendor aktif bertambah, dan kartu vendor langsung tampil di beranda.
