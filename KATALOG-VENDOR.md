# BIVAK RENTAL — Katalog Barang Vendor (versi sederhana)

Dokumen ini menjelaskan perubahan pada bagian vendor: dari "olshop" penuh
(keranjang, pesanan, pembayaran) menjadi **katalog sederhana** — tiap vendor
memperlihatkan barang yang mereka punya, dan tiap vendor bisa memperbarui
sendiri daftar barangnya.

---

## 1. Prinsip platform (wajib tampil di web)

> **BIVAK RENTAL hanya mempertemukan penyewa dan vendor rental.**
> Setelah penyewa memilih vendor, seluruh transaksi — harga akhir, pembayaran,
> jaminan, serah terima, dan pengembalian barang — diurus dan dikomunikasikan
> **langsung dengan vendor tersebut, tanpa perantaraan BIVAK RENTAL**.
> Daftar barang, jumlah, dan harga adalah data yang diisi sendiri oleh vendor.

Catatan itu muncul di 4 tempat:

| Lokasi | Bentuk |
| --- | --- |
| Atas daftar vendor (halaman utama) | catatan penuh (`#shopSectionNote`, ada di `index.html`) |
| Modal detail vendor (di atas daftar barang) | catatan penuh (dirender `vendor-shop.js`) |
| Modal pendaftaran vendor | catatan ringkas |
| Dashboard kelola barang + footer | catatan ringkas |

TIDAK ADA fitur keranjang, checkout, pengiriman, maupun pembayaran di web ini.
Tombol WhatsApp murni untuk menghubungi vendor langsung.

---

## 2. Yang dilihat penyewa

Klik **Lihat Barang** pada kartu vendor → modal berisi:

- identitas toko (logo, kota, alamat, status terverifikasi)
- ringkasan: jumlah jenis barang, total unit, harga sewa termurah
- tab kategori (Tenda, Carrier, Cooking Set, Sleeping Bag, Lighting, Apparel, Accessories)
- kartu tiap barang: **foto, nama barang, kategori, deskripsi, jumlah unit dimiliki,
  jumlah unit siap disewa, harga sewa per hari**
- satu tombol: **Hubungi Vendor Langsung** (WhatsApp)

Kartu vendor di halaman utama juga menampilkan 4 barang teratas beserta harga
dan jumlah unitnya. Semua data ini nyata dari database — **stok contoh/demo
sudah dihapus** (dulu `generateDemoItems` menampilkan barang fiktif).

---

## 3. Yang bisa dilakukan vendor

Ikon toko di footer → **Kelola Barang Toko**:

1. Login: **nama toko** + **PIN 6 digit** (PIN diberikan admin dari Panel Admin saat toko disetujui).
2. **Tambah Barang**: nama, kategori, harga sewa/hari, jumlah unit, foto, deskripsi.
3. **Ubah** barang (ikon pensil): semua kolom bisa diedit, termasuk harga.
4. **Hapus** barang (ikon tong sampah).
5. **Atur jumlah siap disewa** dengan tombol − / + (mis. 3 dari 5 unit sedang dipakai).
6. **Keluar** untuk mengakhiri sesi.

Tiap vendor hanya bisa menyentuh barang miliknya sendiri — dipaksa di sisi
database, bukan cuma di tampilan.

---

## 4. Cara pasang (urut, sekali saja)

### 4.1 Jalankan SQL di Supabase

Buka project **`pledqkanjduhabruvgxx`** → SQL Editor → jalankan berurutan:

1. `db/OLSHOP-01-VENDOR-SECURITY.sql`
2. `db/OLSHOP-02-VENDOR-ITEMS.sql`
3. `db/OLSHOP-04-ADMIN-PIN.sql`  <- ini yang membuat PIN tampil di Panel Admin
4. `db/OLSHOP-03-CEK-DAN-PIN.sql` (opsional: query pemeriksaan lewat SQL Editor)

> Jangan menjalankan lagi `FIX-VENDOR-ITEMS.sql` yang lama — file itu memasang
> policy `vendor_items_all_anon` yang membuat siapa pun bisa mengubah barang
> vendor lain. Skrip 02 sengaja menghapus policy tersebut.

### 4.2 Bagikan PIN ke vendor (dari Panel Admin, tanpa SQL)

Setelah `OLSHOP-04-ADMIN-PIN.sql` dijalankan sekali, admin tidak perlu lagi
membuka Supabase:

1. Buka **Panel Admin** (ikon di header/footer) lalu masuk dengan email admin.
2. Vendor baru mendaftar -> tab **Antrean** -> klik tombol centang (**Setujui**).
3. Begitu disetujui, **PIN 6 angka langsung tampil di layar** dalam kotak hijau,
   lengkap dengan tombol:
   - **Salin PIN**
   - **Kirim ke Vendor** -> membuka WhatsApp vendor dengan pesan siap kirim
     (nama toko + PIN + cara masuk + catatan bahwa BIVAK hanya mempertemukan
     penyewa dan vendor)
4. Untuk vendor yang sudah tayang: tab **Vendor Aktif** -> tombol **PIN** di
   kolom aksi. Di situ tersedia:
   - **Buat PIN Baru** (kalau vendor lupa PIN; PIN lama langsung mati)
   - **Tetapkan PIN Sendiri** (isi 6 angka pilihan sendiri)
   - **Buka Kunci** (kalau vendor salah PIN 5x dan terkunci 15 menit)

Tombol **PIN** berwarna kuning bila toko itu belum punya PIN sama sekali.

> PIN hanya bisa dilihat **sekali**, saat dibuat. Yang tersimpan di database
> cuma hash bcrypt-nya, jadi tidak ada cara membaca PIN lama — kalau hilang,
> tinggal buat PIN baru. Semua fungsi PIN menolak siapa pun yang bukan admin
> (dicek lewat tabel `public.admins`), jadi pengunjung biasa tidak bisa
> memanggilnya walau tahu nama fungsinya.

Alternatif lewat SQL Editor tetap ada di `db/OLSHOP-03-CEK-DAN-PIN.sql`
(nomor 5 dan 6) kalau sewaktu-waktu dibutuhkan.

### 4.3 Unggah web

Unggah seluruh folder seperti biasa (Vercel / hosting statis). Berkas baru:
`vendor-shop.js` dan `vendor-shop.css`; keduanya sudah dipanggil `index.html`.

---

## 5. Ringkasan perubahan berkas

| Berkas | Perubahan |
| --- | --- |
| `vendor-shop.js` **(baru)** | katalog barang vendor + dashboard kelola barang bertoken |
| `vendor-shop.css` **(baru)** | gaya katalog, catatan platform, baris kelola barang |
| `index.html` | memuat modul baru, catatan platform di 3 titik, teks dashboard vendor diperbaiki, cache-bust `?v=20260907-01` |
| `app.js` | 20 KB kode olshop lama dibuang (keranjang, stok demo, dashboard lama); daftar vendor tidak lagi di-cache di `localStorage`; `alert`/`console.log [DEBUG]` dihapus; pengajuan vendor wajib lewat server |
| `db/OLSHOP-01-VENDOR-SECURITY.sql` **(baru)** | PIN toko jadi hash bcrypt + tabel sesi + RPC login/logout + reset PIN admin |
| `db/OLSHOP-02-VENDOR-ITEMS.sql` **(baru)** | rapikan `vendor_items`, tutup lubang RLS, RPC kelola barang per vendor |
| `db/OLSHOP-03-CEK-DAN-PIN.sql` **(baru)** | query pemeriksaan & pengelolaan PIN lewat SQL Editor |
| `db/OLSHOP-04-ADMIN-PIN.sql` **(baru)** | fungsi PIN untuk Panel Admin: buat/reset/lihat status/buka kunci |
| `admin-pin.js` **(baru)** | PIN tampil di Panel Admin saat approve + tombol PIN per vendor + kirim WhatsApp |
| `supabase-data-v2.js`, `supabase-data-v3.js` | dihapus (kembar dengan `supabase-data.js` dan tidak dipakai) |
| `supabase-config.js` | komentar project ref lama diperbaiki |

---

## 6. Masalah lama yang ikut beres

1. Barang "contoh" fiktif tidak lagi tampil sebagai milik vendor.
2. PIN toko tidak lagi bisa dibaca lewat anon key.
3. Siapa pun tidak lagi bisa menambah/menghapus barang vendor lain (policy `USING (true)` dihapus).
4. Barang hanya tampil bila vendornya benar-benar sudah **disetujui admin**.
5. Tidak ada lagi `alert('Fungsi handleVendorSubmit TERPANGGIL!')` yang muncul ke pengunjung.
6. Daftar vendor tidak lagi berbeda-beda antar perangkat (dulu tersimpan di `localStorage`).
7. Stok tidak bisa minus / melebihi jumlah unit (dijaga constraint database).
8. Nama barang kembar dalam satu toko ditolak.
9. Percobaan PIN salah 5 kali → terkunci 15 menit.

---

## 7. Uji cepat setelah pasang

1. Buka halaman → catatan platform tampil di atas daftar vendor.
2. Klik **Lihat Barang** pada vendor mana pun → daftar barang tampil (atau pesan
   "Vendor ini belum menambahkan daftar barang" bila memang kosong).
3. Panel Admin → setujui satu vendor → PIN tampil di layar. Lalu footer → ikon toko → login pakai nama toko + PIN → tambah 1 barang → tutup modal
   → muat ulang halaman → barang tadi tampil di kartu vendor dan di modal detail.
4. Coba − / + pada dashboard → jumlah siap disewa berubah dan ikut tampil di katalog.
