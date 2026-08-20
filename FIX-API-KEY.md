# 🔧 Perbaikan: Invalid API Key (401)

## Masalah
Anon key di `supabase-config.js` sudah tidak valid (expired atau di-revoke).

## Solusi

### 1. Ambil Anon Key Baru dari Supabase

1. Buka: https://supabase.com/dashboard/project/sqxwhfdarnzypicoamzl/settings/api
2. Di bagian **"API Keys"**, copy **anon public** key
3. Key akan terlihat seperti: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Update File Konfigurasi

Edit file: `supabase-config.js`

Ganti baris ini:
```javascript
anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxeHdoZmRhcm56eXBpY29hbXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDYzMDYsImV4cCI6MjA5OTYyMjMwNn0.aG7hipA3YHkOnmofSilI8qzMFNAlYiSYPW4Gl8BR0z1W4",
```

Dengan key baru dari dashboard.

### 3. Commit & Push

```bash
git add supabase-config.js
git commit -m "chore: update Supabase anon key"
git push origin main
```

### 4. Refresh Halaman

Tekan `Ctrl + Shift + R` di browser untuk hard refresh.

---

## Verifikasi

Setelah key diperbaiki, console harus menampilkan:
```
[BIVAK] Vendors query: { data: [...], error: null }
[BIVAK] Terhubung ke Supabase (email-only admin).
```

Dan vendor akan muncul di halaman.
