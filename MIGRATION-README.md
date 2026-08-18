# 🔄 BIVAK v4 Migration: Lelang → Donasi Pintu Angin

## Ringkasan Perubahan

Sistem **Lelang (Auction)** telah **dihapus sepenuhnya** dan diganti dengan sistem **Donasi Pintu Angin** yang terhubung ke database Pintu Angin Bawakaraeng.

---

## 📋 Perubahan File

### 1. `supabase-schema.sql`
**DIHAPUS:**
- `auction_status_type` ENUM
- `auction_items` table
- `bids` table
- `place_bid()` RPC function
- `total_donation_raised()` RPC function

**DITAMBAH:**
- `donation_status_type` ENUM (`baru`, `disetujui`, `ditolak`)
- `donasi` table (sinkron dengan Pintu Angin)
- RLS policies untuk donasi (publik hanya lihat yang disetujui)
- Indeks performa

### 2. `index.html`
**DIHAPUS:**
- Section `#lelang` (auction section)
- Modal `modalLelang` (form donasi barang lelang)
- Modal `modalBid` (form bid/tawar)
- Link navigasi "Lelang Donasi"
- Tombol "Donasi Lelang"

**DITAMBAH:**
- Section `#donasi` (Donasi Pintu Angin Bawakaraeng)
- Modal `modalDonasi` (form donasi cash)
- Link navigasi "Donasi Pintu Angin"
- Tombol "Donasi Sekarang"
- Donation progress bar & tier buttons
- Donor leaderboard
- Alokasi dana chart
- Tab admin "Donasi"

### 3. `app.js`
**DIHAPUS:**
- `auctionsData` array (mock data lelang)
- `renderAuctions()` function
- `openBidModal()` function
- `handleBidSubmit()` function
- Timer countdown lelang
- Semua fungsi terkait lelang/auction

**DITAMBAH:**
- `_tiers` array (nominal donasi: 20K, 50K, 100K, 250K)
- `_dummyDonors` array (15 sample donatur)
- `_alloc` array (alokasi dana: 45% bibit, 25% patroli, 15% edukasi, 15% alat)
- `renderTier()` / `selTier()` - render tombol nominal
- `renderAlloc()` - render chart alokasi
- `renderDonation()` - render leaderboard donatur
- `donasi()` - buka modal donasi
- `donasiKirim()` - submit donasi
- `donasiApprove()` - admin approve/reject donasi
- `renderAdminTables()` - render semua tab admin termasuk donasi
- `handleDonasiSubmit()` - form submission handler
- Toast notifications

### 4. `supabase-data.js`
**DIHAPUS:**
- `mapAuction()` function
- `findAuction()` function
- `handleAuctionSubmit()` function
- `handleBidSubmit()` function
- Semua referensi ke `auction_items` dan `bids` table

**DITAMBAH:**
- `_dnRows` & `_dnCloud` variables
- `handleDonasiSubmit()` Supabase version
- `donasiApprove()` Supabase version
- Loading donasi dari database di `loadPublicData()`
- Badge counter untuk tab donasi

---

## 🗄️ Database Schema Baru

```sql
CREATE TYPE donation_status_type AS ENUM ('baru', 'disetujui', 'ditolak');

CREATE TABLE IF NOT EXISTS public.donasi (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        TEXT        NOT NULL,
    email       TEXT        NOT NULL DEFAULT '',
    amt         BIGINT      NOT NULL DEFAULT 0,
    source      TEXT        NOT NULL DEFAULT 'bivak',
    astatus     donation_status_type NOT NULL DEFAULT 'baru',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS Policies:**
- `donasi_select_public`: Hanya lihat yang `astatus = 'disetujui'`
- `donasi_select_admin`: Admin lihat semua
- `donasi_insert_public`: Siapa pun bisa insert dengan status 'baru'
- `donasi_insert_admin`: Admin bisa insert langsung
- `donasi_update_admin`: Hanya admin bisa approve/reject
- `donasi_delete_admin`: Hanya admin bisa hapus

---

## 🔗 Integrasi Pintu Angin

Sistem donasi di BIVAK sekarang terhubung ke database yang sama dengan Pintu Angin Bawakaraeng. Data donasi bisa disinkronkan dengan:

- `supabase-donasi.sql` dari project Bawakaraeng
- Panel admin Pintu Angin bisa approve/reject donasi
- Leaderboard donatur tampil real-time

**Cara Setup:**
1. Jalankan `SUPABASE-MIGRASI-DONASI.sql` di Supabase Dashboard
2. Update `supabase-config.js` dengan credentials project Anda
3. Tambahkan admin ke tabel `admins` di Supabase

---

## 🎨 UI Changes

| Elemen | Sebelum | Sesudah |
|--------|---------|---------|
| Navigation | "Lelang Donasi" | "Donasi Pintu Angin" |
| Hero Stats | Donasi dari lelang | Donasi terkumpul |
| Section | Auction cards + timer | Donation tier + progress |
| Modal | Lelang form + Bid form | Donasi form |
| Admin Tab | Lelang Donasi | Donasi |
| CTA Button | "Donasi Lelang" (amber) | "Donasi" (rose) |

---

## ✅ Checklist Testing

- [ ] Vendor listing masih berfungsi
- [ ] Filter vendor masih berfungsi
- [ ] Form pasang iklan vendor masih berfungsi
- [ ] Form donasi bisa dibuka dan submit
- [ ] Donasi masuk ke database (check Supabase)
- [ ] Admin panel bisa login
- [ ] Tab Donasi di admin panel muncul
- [ ] Approve/reject donasi berfungsi
- [ ] Leaderboard donatur update setelah approve
- [ ] Toast notifications muncul
- [ ] Responsive design tetap ok

---

## 📝 Catatan Penting

1. **Data lama**: Semua data auction_items dan bids akan HILANG setelah migrasi. Backup dulu jika diperlukan!
2. **Image QRIS**: Tambahkan file `qris-gopay.png` di folder `assets/` untuk tampilan donasi yang lebih baik.
3. **Admin setup**: Gunakan SQL Block 10 di schema untuk menambahkan admin.
4. **Source field**: Donasi dari BIVAK ditandai `source='bivak'`, bisa ditambah `source='pintu_angin'` untuk integrasi nanti.
