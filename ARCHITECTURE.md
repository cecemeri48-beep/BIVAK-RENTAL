# Arsitektur & Panduan Deployment BIVAK (Bursa Interaktif Vendor Alam & Komunitas)

Dokumen ini menjelaskan rancangan arsitektur sistem, skema data, alur kerja approval admin, serta panduan langkah-demi-langkah untuk melakukan **deployment ke GitHub, Vercel, dan Supabase**.

---

## 1. Arsitektur Sistem BIVAK

BIVAK dirancang menggunakan arsitektur Jamstack modern yang sangat cepat, responsif, hemat biaya server, dan mudah diskalakan.

```
                  +-----------------------------------+
                  |           PENGGUNA /              |
                  |     PENDAKI & VENDOR SULSEL       |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |         FRONTEND HOSTING          |
                  |          Vercel / GitHub          |
                  |   (HTML5, Modern CSS, ES6 JS)     |
                  +-----------------------------------+
                       /           |           \
                      /            |            \
                     v             v             v
       +------------------+  +-----------------+  +----------------------+
       | CATALOG & SEARCH |  |  LELANG DONASI  |  | ADMIN APPROVAL PANEL |
       |  (Filter Sulsel) |  |   (Bid Engine)  |  |  (Approve/Reject Ad) |
       +------------------+  +-----------------+  +----------------------+
                 \                 |                 /
                  +----------------+----------------+
                                   |
                                   v
                  +-----------------------------------+
                  |         SUPABASE BACKEND          |
                  |  - Database: PostgreSQL           |
                  |  - Auth: Row Level Security (RLS) |
                  |  - Storage: Vendor & Item Photos  |
                  +-----------------------------------+
```

---

## 2. Alur Kerja Utama System (Data Flow)

### A. Alur Iklan Vendor (Approval Workflow)
1. **Pendaftaran**: Vendor rental outdoor (Makassar, Gowa, Maros, Malino, Toraja, dll.) mengisikan form *Pasang Iklan Vendor*.
2. **Antrean Pending**: Data tersimpan ke tabel `vendors` dengan status `'pending'`.
3. **Approval Admin**: Admin membuka **Panel Admin Approval**, meninjau profil vendor, lalu menekan tombol **Approve**.
4. **Publikasi**: Status berubah menjadi `'approved'` dan iklan vendor langsung tampil di katalog publik secara otomatis.
5. **Direct Order**: Pendaki mengklik tombol **WA** dan langsung membuka percakapan transaksi dengan vendor di WhatsApp.

### B. Alur Lelang Donasi (Conservation & Humanitarian Aid)
1. **Donasi Barang**: Komunitas/donatur menyumbangkan peralatan outdoor untuk didonasikan.
2. **Interactive Bidding**: Pengunjung mengajukan penawaran (Bid) lebih tinggi secara real-time.
3. **Penyaluran**: 100% dana hasil lelang disalurkan ke program konservasi (Reboisasi Hutan Bawakaraeng, Clean-up Latimojong, & Tanggap Bencana Sulsel).

---

## 3. Panduan Deployment

### Step 1: Push Kode ke GitHub
1. Inisialisasi Git di repositori lokal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit BIVAK Sulsel Marketplace"
   ```
2. Buat repositori baru di GitHub dengan nama `bivak-sulsel-marketplace`.
3. Hubungkan remote dan push:
   ```bash
   git remote add origin https://github.com/USERNAME/bivak-sulsel-marketplace.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Setup Database Supabase
1. Login ke dashboard [Supabase](https://supabase.com/).
2. Buat proyek baru bernama `bivak-sulsel`.
3. Buka **SQL Editor** di dashboard Supabase.
4. Salin seluruh isi file `supabase-schema.sql` dan jalankan script (`Run`).
5. Ambil `SUPABASE_URL` dan `SUPABASE_ANON_KEY` pada menu **Project Settings -> API**.

---

### Step 3: Deployment ke Vercel
1. Login ke [Vercel](https://vercel.com/) menggunakan akun GitHub.
2. Klik tombol **"Add New Project"** -> Import dari repositori GitHub `bivak-sulsel-marketplace`.
3. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = `URL_SUPABASE_ANDA`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `ANON_KEY_SUPABASE_ANDA`
4. Klik **Deploy**. Website BIVAK akan langsung aktif dalam hitungan detik dengan domain gratis Vercel (misal: `bivak-sulsel.vercel.app`).

---

## 4. Motion Layer (Animasi & Interaksi)

BIVAK memakai **motion layer** terpisah yang mengadopsi tiga pendekatan populer, namun
ditulis **vanilla JS tanpa dependensi** agar tetap cocok dengan arsitektur Jamstack
statis (tanpa React, tanpa build step, tanpa npm install).

| Referensi | Diterapkan sebagai | File |
| --- | --- | --- |
| Framer Motion | Spring solver + `animate()` di atas Web Animations API | `motion.js` |
| Skill UI/UX "Max Pro" | Prinsip craft: gerakan halus, aksesibilitas, failsafe | `motion.css` + `motion.js` |
| 21st.dev — Interactive 3D | Tilt kartu 3D + spotlight border mengikuti kursor | `motion.js` |
| 21st.dev — Shader Animation | Aurora & siluet punggungan gunung berbasis WebGL | `shader-hero.js` |

### A. Kenapa bukan Framer Motion asli?

Framer Motion adalah library **React**. Project ini murni HTML/CSS/JS, jadi yang ditiru
adalah **mesinnya**, bukan paketnya:

- `spring({ stiffness, damping, mass })` mensimulasikan pegas teredam pada 240 Hz,
  lalu mengubah hasilnya menjadi CSS `linear()` easing.
- Preset tersedia: `gentle`, `snappy`, `bouncy`, `stiff`.
- Hasilnya gerakan terasa punya bobot, bukan `ease-in-out` yang kaku.

Bisa dipakai manual dari kode lain:

```js
BivakMotion.animate(el, { opacity: [0, 1] }, { spring: BivakMotion.SPRING.bouncy })
```

### B. Yang aktif otomatis

1. **Reveal on scroll + stagger** — elemen dipilih lewat selector, tidak perlu menambah
   atribut di HTML.
2. **Counter angka** — statistik hero menghitung naik saat terlihat.
3. **Interactive 3D tilt** — otomatis menempel ke `.vendor-card` & `.auction-card`,
   termasuk kartu yang baru dirender (via `MutationObserver`).
4. **Magnetic button + ripple** — pada `.btn-primary` dan `.btn-amber`.
5. **Spring modal** — `openModal()` / `closeModal()` milik `app.js` dibungkus ulang,
   **tanpa mengubah satu baris pun logika bisnis**. Sekaligus menambah tutup lewat
   klik backdrop, tombol `Esc`, dan auto-focus.
6. **Scroll progress bar + navbar condense**.

### C. Aturan wajib yang dipegang

- **Animasi tidak boleh menyembunyikan konten.** Ada tiga lapis failsafe: state awal
  hanya aktif jika class `.m-js` terpasang, sweep otomatis saat `load`, dan hard
  failsafe 5 detik yang memaksa semua konten tampil bila observer gagal.
- **`prefers-reduced-motion` dihormati penuh** — semua gerakan mati, konten tetap utuh.
- **Shader punya fallback** — bila WebGL tidak tersedia, otomatis turun ke CSS gradient.
- **Hemat baterai** — render shader berhenti saat hero keluar layar atau tab tidak aktif.
- **Tanpa CDN tambahan** — tidak ada request pihak ketiga baru.

---

## 5. Struktur Direktori Proyek

```
bivak-sulsel-marketplace/
├── assets/
│   ├── hero-bg.png           # Gambar background pegunungan Sulsel
│   ├── logo.png              # Emblem logo BIVAK
│   ├── gear-tent.png         # Gambar katalog tenda dome
│   ├── gear-carrier.png      # Gambar katalog tas carrier 75L
│   └── auction-jacket.png    # Gambar item lelang donasi
├── index.html                # Main SPA Landing Page & Modal Views
├── styles.css                # Custom CSS Design System (Outdoor Dark Mode)
├── motion.css                # Motion layer: tilt, shader, progress, reduced-motion
├── app.js                    # Interactive Logic, Filter & Admin Controller
├── shader-hero.js            # WebGL Shader Animation untuk background hero
├── motion.js                 # Spring motion engine (pendekatan Framer Motion)
├── supabase-schema.sql       # PostgreSQL Tables & RLS Policies
└── ARCHITECTURE.md           # Dokumentasi Sistem & Deployment
```

> Urutan pemuatan penting: `styles.css` → `motion.css`, dan `app.js` → `shader-hero.js`
> → `motion.js`. Motion layer sengaja dimuat terakhir agar bisa membungkus fungsi
> `app.js` tanpa memodifikasinya.

---

## 6. Data Layer (Supabase)

Situs ini tetap statis. Tidak ada build step, tidak ada server Node. Supabase
dipanggil langsung dari browser lewat `@supabase/supabase-js` (UMD, via CDN).

### 6.1 Tiga file yang ditambahkan

| File | Peran |
| --- | --- |
| `supabase-config.js` | Menyimpan Project URL + anon key. Kosong = situs jalan dalam mode demo. |
| `supabase-schema.sql` | Skema database, RLS, dan dua RPC. Dijalankan blok per blok di SQL Editor. |
| `supabase-data.js` | Lapisan data: mengganti sumber data `app.js` dari array statis menjadi query Supabase. |

### 6.2 Pola "bungkus, jangan ubah"

`app.js` sama sekali tidak disentuh. `supabase-data.js` dimuat **setelah**
`app.js` lalu menimpa fungsi-fungsi yang berhubungan dengan data
(`handleVendorSubmit`, `handleAuctionSubmit`, `handleBidSubmit`,
`approveVendor`, `rejectVendor`, `removeActiveVendor`, `openAdminPanel`).
Fungsi render (`renderVendors`, `renderAuctions`) dipakai ulang apa adanya.

Konsekuensinya, **urutan tag `<script>` di `index.html` bersifat wajib**:

```
supabase-js (CDN)  ->  supabase-config.js  ->  app.js  ->  shader-hero.js
                   ->  motion.js  ->  supabase-data.js
```

Dua alasannya. Pertama, `vendorsData`, `pendingVendorsData`, `auctionsData`,
dan `totalDonationRaised` adalah `let` di lingkup global `app.js`, bukan
properti `window`; penugasan ulang lintas-file hanya berhasil kalau
`supabase-data.js` dieksekusi belakangan. Kedua, `motion.js` memasang
`MutationObserver` pada grid, sehingga baris hasil query database tetap
kebagian animasi tilt dan stagger.

Kalau `supabase-config.js` masih kosong, `supabase-data.js` berhenti lebih awal
dan situs jatuh ke data demo di `app.js`. Ini membuat file HTML tetap bisa
dibuka lokal tanpa koneksi.

### 6.3 ID pengganti

`app.js` menulis `onclick="openVendorDetail(${v.id})"` tanpa tanda kutip.
UUID mentah di posisi itu menghasilkan JavaScript yang tidak valid. Karena itu
setiap baris dari database diberi ID numerik berurutan saat dipetakan, dan UUID
aslinya disimpan terpisah di properti `dbId` untuk keperluan query.

### 6.4 Kenapa penawaran lewat RPC

Tabel `bids` tidak punya kebijakan INSERT publik, dan `auction_items` tidak
punya kebijakan UPDATE publik. Semua penawaran wajib melalui
`place_bid()` yang berstatus `SECURITY DEFINER`. Validasi (nama, nomor,
status lelang, waktu berakhir, nominal harus naik) berjalan di sisi server,
sehingga tidak bisa dilewati dari konsol browser meski anon key bersifat
publik. `SELECT ... FOR UPDATE` mengunci baris agar dua penawar pada detik
yang sama tidak saling menimpa.

Dengan pola yang sama, `total_donation_raised()` menjumlahkan donasi historis
(`site_settings.donation_base`) dengan seluruh bid tertinggi yang sedang
berjalan.

### 6.5 Catatan operasional

- Tabel `bids` berisi nomor WhatsApp penawar, jadi hanya admin yang boleh
  membacanya.
- Donasi barang langsung tayang tanpa moderasi. Bila kena spam, ubah `'active'`
  menjadi `'cancelled'` pada kebijakan `"Public Insert Auction"`.
- Durasi lelang baru dipatok 24 jam karena formulir donasi belum punya isian
  durasi.
- Anon key aman dipublikasikan; yang menjaga data adalah RLS. Kunci
  `service_role` tidak boleh pernah masuk ke file mana pun di repositori ini.
