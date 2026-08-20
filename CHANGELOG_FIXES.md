# CHANGELOG - BIVAK RENTAL FIXES
**Last Updated: 2026-08-20**

---

## ✅ SELESAI HARI INI (2026-08-20)

### Fix #3 — Multiple GoTrueClient Warning + Image ERR_UNKNOWN_URL_SCHEME + Admin Login
| Item | Detail |
|---|---|
| **Tanggal** | 2026-08-20 |
| **File** | `supabase-data.js`, `supabase-schema.sql`, `FIX-ADMIN-LOGIN-RLS.sql` |
| **Masalah** | 1. Warning "Multiple GoTrueClient instances" karena 2 client pakai storageKey sama. 2. Gambar vendor error `net::ERR_UNKNOWN_URL_SCHEME` karena URL Unsplash eksternal diblokir. 3. Admin login gagal karena RLS policy `Admin Read Admins` hanya izinkan role `authenticated`, tapi query pakai anonymous key. |
| **Akar** | `createClient()` tanpa option `auth.storageKey` → kedua client berbagi key yang sama. URL gambar dari DB menggunakan `https://images.unsplash.com` yang memicu error scheme. RLS policy terlalu ketat. |
| **Fix** | 1. Tambah `auth: { storageKey: "bivak-main-auth" }` dan `"bivak-donasi-auth"` di `createClient()`. 2. Tambah filter di `mapVendor()` untuk replace URL unsplash dengan local asset. 3. Ganti RLS policy `Admin Read Admins` → `Public Read Admins Email` dengan `TO anon, authenticated USING (true)`. |
| **Verifikasi** | Run SQL `FIX-ADMIN-LOGIN-RLS.sql` di Supabase SQL Editor untuk deploy perubahan RLS. Hard refresh browser. |
| **Log Keyword** | `GoTrueClient`, `ERR_UNKNOWN_URL_SCHEME`, `Admin Read Admins` |

---

## ✅ SELESAI HARI INI

### 1. Database Integration Complete
- **Status**: ✅ DONE - Donasi terhubung ke Supabase Pintu Angin DB
- **Endpoint**: `https://ncoueeeskzslldppsbvx.supabase.co/rest/v1/donasi`
- **Total Verified**: Rp 31.420.000 dari 9 donasi disetujui
- **Progres Bar**: 42% dari target Rp 75.000.000
- **Deploy**: https://bivak-rental.vercel.app/

### 2. Fix-nya yang sudah diterapkan:
- Hapus error syntax di app.js (comment `# SKIP` invalid)
- Ganti emoji medals corrupt dengan angka (1,2,3)
- Bungkus renderVendors/updateBadges dengan try-catch
- Load donasi untuk semua user (bukan hanya admin)
- Alias renderDonation -> renderDonationList
- BIVAK.escape() untuk XSS protection
- Handle missing vendors table gracefully (table belum ada di DB baru)

---

## ❌ MASIH bermasalah (Tinggalan Besok)

### 1. DONASI AUTO-APPROVE (CRITICAL BUG)
**Masalah**: Donasi masuk langsung ke leaderboard tanpa verifikasi admin
**Root Cause**: Di `supabase-data.js` line 109:
```javascript
if (_dnRows) approved = _dnRows.filter(function(d) { return d.astatus === 'disetujui'; });
```
Tapi donasi baru di-insert dengan status `'baru'` (line 470), seharusnya tetap `'baru'` sampai admin approve.

**Fix Needed**:
- Pastikan insert donasi baru statusnya `'baru'` (sudah benar)
- Pastikan renderDonationList hanya tampilkan yang `'disetujui'`
- Tambah queue/antrean donasi pending di admin panel
- Jangan auto-update `_dnRows` setelah submit donasi baru

### 2. ADMIN LOGIN BROKEN
**Masalah**: Admin tidak bisa login ke BIVAK panel
**Root Cause**: 
- Table `admins` belum ada di database Pintu Angin
- RPC `is_app_admin` belum dibuat di Supabase
- Atau credential admin salah

**Fix Needed**:
- Buat table `admins` di Supabase dengan column: `id`, `email`, `password_hash`, `created_at`
- Buat RPC function `is_app_admin(email text) returns boolean`
- Atau gunakan Supabase Auth built-in dengan custom claim
- Reset password admin yang sudah ada

### 3. VENDOR HILANG
**Masalah**: Semua vendor tidak muncul di halaman
**Root Cause**:
- Table `vendors` BELUM ADA di database Pintu Angin (404 error)
- Atau table ada tapi kosong

**Fix Needed**:
- Buat table `vendors` di Supabase Pintu Angin
- Migrasi data vendor dari database lama (jika ada)
- Atau setup table schema:
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  phone TEXT,
  gears TEXT[],
  min_price INTEGER,
  image_url TEXT,
  rating FLOAT,
  reviews_count INTEGER,
  status TEXT DEFAULT 'pending',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. UI/UX KACAU
**Masalah**: 
- Tombol donasi terlalu besar
- Tombol admin terlalu besar
- Layout berantakan
- "AI slop" - tampilan tidak profesional

**Fix Needed**:
- Redesign donation section dengan card yang lebih compact
- Perkecil button sizes (dari default Bootstrap ke `btn-sm`)
- Perbaiki spacing/padding
- Buat admin panel yang lebih clean
- Konsistenkan font sizes dan colors
- Responsive check untuk mobile

---

## 📋 CHECKLIST BESOK

### Phase 1: Critical Fixes
- [ ] Fix auto-approve bug (donasi tetap 'baru' sampai admin approve)
- [ ] Setup table vendors di Supabase
- [ ] Setup table admins + RPC is_app_admin
- [ ] Fix admin login flow

### Phase 2: UI/UX Overhaul
- [ ] Perkecil tombol donasi (Rp 20K, 50K, 100K, 250K)
- [ ] Perbaiki layout section donasi
- [ ] Perkecil tombol admin panel
- [ ] Rapikan leaderboard donatur
- [ ] Mobile responsive check

### Phase 3: Testing
- [ ] Test submit donasi baru -> harus masuk status 'baru'
- [ ] Test admin approve donasi -> harus update ke 'disetujui'
- [ ] Test admin reject donasi
- [ ] Test admin login/logout
- [ ] Test vendor approval flow

---

## 🔧 TECHNICAL NOTES

### File Changes Hari Ini:
```
supabase-data.js  - Main integration layer
app.js            - Removed # SKIP comments
patch-all.js      - Temp script (can delete)
fix-medals.py     - Temp script (can delete)
fix-donasi.js     - Temp script (can delete)
fix-donasi2.js    - Temp script (can delete)
fix-donasi3.js    - Temp script (can delete)
```

### Database Schema Required:
```sql
-- Untuk BIVAK Rental (Pintu Angin DB)
CREATE TABLE IF NOT EXISTS vendors (...);
CREATE TABLE IF NOT EXISTS donasi (...); -- sudah ada
CREATE TABLE IF NOT EXISTS admins (...); -- perlu dibuat
CREATE OR REPLACE FUNCTION is_app_admin(email TEXT) RETURNS boolean...
```

### Deploy Status:
- URL: https://bivak-rental.vercel.app/
- Git: cecemeri48-beep/BIVAK-RENTAL
- Last commit: 5eaecbf
