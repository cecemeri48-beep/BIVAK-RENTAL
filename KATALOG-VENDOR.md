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

1. Login: **nama toko** + **PIN 6 digit**.
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
3. `db/OLSHOP-03-CEK-DAN-PIN.sql` (opsional: pemeriksaan + kelola PIN)

> Jangan menjalankan lagi `FIX-VENDOR-ITEMS.sql` yang lama — file itu memasang
> policy `vendor_items_all_anon` yang membuat siapa pun bisa mengubah barang
> vendor lain. Skrip 02 sengaja menghapus policy tersebut.

### 4.2 Bagikan PIN ke vendor

PIN tidak lagi bisa dibaca dari browser (dulu kolom `vendors.edit_pin` bisa
di-`SELECT` siapa saja dengan anon key). Sekarang tersimpan sebagai hash bcrypt
di tabel `vendor_secrets`. Untuk memberi PIN baru ke vendor, jalankan di SQL Editor:

```sql
-- PIN acak, tampil sekali (catat lalu kirim ke vendor)
SELECT v.name, public.admin_vendor_reset_pin(v.id) AS pin_baru
FROM public.vendors v
WHERE v.name ILIKE '%celebes outdoor%';

-- atau tetapkan PIN sendiri
SELECT public.admin_vendor_set_pin(
  (SELECT id FROM public.vendors WHERE name ILIKE '%celebes outdoor%'),
  '123456'
);
```

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
| `db/OLSHOP-03-CEK-DAN-PIN.sql` **(baru)** | query pemeriksaan & pengelolaan PIN |
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
3. Footer → ikon toko → login pakai nama toko + PIN → tambah 1 barang → tutup modal
   → muat ulang halaman → barang tadi tampil di kartu vendor dan di modal detail.
4. Coba − / + pada dashboard → jumlah siap disewa berubah dan ikut tampil di katalog.

---

## Tambahan: PIN toko dibuat dari Panel Admin (tanpa buka Supabase)

Sejak berkas `admin-pin.js` + `db/OLSHOP-04-ADMIN-PIN.sql` dipasang, admin **tidak perlu lagi** menjalankan SQL untuk membagikan PIN.

### Alur pemakaian

1. Vendor mendaftar sendiri lewat tombol **Pasang Iklan Rental Outdoor** di web.
2. Admin buka **Panel Admin** (ikon koin di footer) → tab **Menunggu Persetujuan** → klik **Setujui**.
3. Begitu disetujui, layar admin langsung menampilkan kotak **PIN Toko** berisi 6 angka, plus dua tombol:
   - **Salin PIN**
   - **Kirim ke Vendor** (membuka WhatsApp dengan pesan siap kirim: nama toko, PIN, dan cara masuk)
4. PIN hanya tampil **sekali**. Yang tersimpan di database adalah hash-nya, bukan angka aslinya.
5. Di tabel **Vendor Aktif** ada tombol **PIN** pada setiap baris:
   - warna normal → toko sudah punya PIN
   - warna kuning → toko belum punya PIN, klik untuk membuatkan
   - di dalamnya tersedia **Tetapkan PIN Sendiri**, **Buka Kunci** (kalau vendor salah PIN 5x), dan **Buat PIN Baru**

### Yang dilakukan vendor

1. Buka web BIVAK RENTAL → klik **ikon toko hijau** di footer (atau tautan *Kelola Barang Toko (Vendor)*).
2. Masukkan **nama toko** + **PIN 6 angka**.
3. Kelola barang: **Tambah Barang** (nama, kategori, harga sewa/hari, jumlah unit, foto, deskripsi), **Ubah**, **Hapus**, dan atur **jumlah unit siap disewa** dengan tombol +/-.

### Kalau muncul pesan error

| Pesan | Artinya | Solusi |
| --- | --- | --- |
| "Fitur Belum Dipasang" | `db/OLSHOP-04-ADMIN-PIN.sql` belum dijalankan | Jalankan sekali di Supabase SQL Editor |
| "Khusus admin" | Email yang dipakai login belum terdaftar sebagai admin | Jalankan `ADD-ADMIN-EMAIL.sql` (isi email Anda) |
| "Login toko belum aktif" | `db/OLSHOP-01-VENDOR-SECURITY.sql` belum dijalankan | Jalankan SQL 01 lebih dulu |
| "Jalankan db/OLSHOP-02..." | Tabel barang belum dibuat | Jalankan SQL 02 |

### Urutan menjalankan SQL (sekali saja)

```
1. db/OLSHOP-01-VENDOR-SECURITY.sql   (login toko + PIN + sesi)
2. db/OLSHOP-02-VENDOR-ITEMS.sql      (tabel barang + RPC kelola barang)
3. db/OLSHOP-04-ADMIN-PIN.sql         (PIN dari Panel Admin)

Opsional: db/OLSHOP-03-CEK-DAN-PIN.sql (hanya untuk mengecek isi tabel)
```

### Catatan platform (wajib, sudah tertulis di web)

BIVAK RENTAL hanya mempertemukan penyewa dan pihak yang menyewakan. Setelah penyewa memilih vendor rental yang mau dipakai, seluruh transaksi dan komunikasi — harga akhir, pembayaran, jaminan, serah terima, sampai pengembalian barang — berhubungan langsung dengan pihak vendor tersebut, tanpa perantaraan BIVAK RENTAL lagi. Karena itu di web **tidak ada** fitur keranjang, pemesanan, pengiriman, maupun pembayaran.

---

## PENTING: kalau muncul "Fitur Belum Dipasang" padahal SQL sudah dijalankan

Ini **bug pesan error**, bukan SQL Anda yang gagal.

**Sebabnya:** fungsi PIN dibuat dengan `SET search_path = public`, sedangkan di Supabase ekstensi `pgcrypto` (penyedia `crypt()` dan `gen_salt()`) terpasang di skema **`extensions`**. Dari dalam fungsi, `crypt()` jadi tidak terlihat dan PostgreSQL menjawab:

```
ERROR: function crypt(text, text) does not exist
```

Karena pesan itu memuat kata *"does not exist"*, web dulu salah menyimpulkan bahwa `OLSHOP-04` belum dijalankan.

**Solusinya:** jalankan sekali di Supabase SQL Editor:

```
db/OLSHOP-05-PERBAIKI-CRYPT.sql
```

Berkas itu menambahkan skema `extensions` ke `search_path` semua fungsi `vendor_shop_*` dan `admin_vendor_*` (tanpa mengubah isi fungsinya), lalu menyegarkan cache skema PostgREST. Aman dijalankan berulang kali dan tidak menghapus data.

Di akhir hasilnya Anda akan melihat:
- `pgcrypto_siap` = **true**
- daftar fungsi dengan kolom `pengaturan` yang memuat kata `extensions`

### Urutan SQL terbaru

```
1. db/OLSHOP-01-VENDOR-SECURITY.sql   (login toko + PIN + sesi)
2. db/OLSHOP-02-VENDOR-ITEMS.sql      (tabel barang + RPC kelola barang)
3. db/OLSHOP-04-ADMIN-PIN.sql         (PIN dari Panel Admin)
4. db/OLSHOP-05-PERBAIKI-CRYPT.sql    (WAJIB kalau muncul pesan di atas)

Opsional: db/OLSHOP-03-CEK-DAN-PIN.sql (hanya untuk mengecek isi tabel)
```

Untuk pemasangan baru, berkas 01/02/04 sudah diperbaiki (`search_path = public, extensions, pg_temp`), jadi masalah ini tidak akan terulang.

### Pesan error sekarang jujur

| Pesan di web | Artinya | Solusi |
| --- | --- | --- |
| "Tinggal Satu Langkah" | Fungsi ada, tapi pgcrypto tidak terbaca | Jalankan `OLSHOP-05` |
| "Fitur Belum Dipasang" | RPC benar-benar tidak ada (kode PGRST202) | Jalankan `OLSHOP-04` |
| "Khusus Admin" | Email login belum terdaftar admin | Jalankan `ADD-ADMIN-EMAIL.sql` |
| Pesan lain + kode | Pesan asli dari server, apa adanya | Baca pesannya |

---

## Vendor mencari menu "Kelola Barang Toko"

Sekarang tersedia di **tiga tempat**:

1. **Menu navigasi atas** — tulisan hijau "Kelola Barang Toko" (juga muncul di menu geser HP)
2. **Tombol di menu geser HP** — sejajar dengan "Pasang Iklan Vendor"
3. **Footer** — tautan "Kelola Barang Toko (Vendor)" dan tombol ikon toko
