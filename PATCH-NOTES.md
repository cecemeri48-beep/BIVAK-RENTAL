# PATCH FINAL BIVAK — 5 September 2026 (v12)

Paket ini mengunci seluruh perbaikan alur **Daftar Vendor → Antrean → Approve → Tayang di Katalog**.
Simpan file ini. Jika nanti ada yang mengedit kode, baca bagian **JANGAN UBAH** dulu.

---

## 1. File yang berubah (timpa di hosting)

| File | Isi perbaikan |
|---|---|
| `index.html` | Tombol kirim vendor + kotak status + cache-buster `?v=20260905-12` |
| `supabase-data.js` | Seluruh logika submit/approve vendor, upload foto, status terlihat |
| `motion.js` | **Perbaikan utama** — ripple & efek magnetik tidak lagi merusak klik |
| `db/FIX-VENDOR-APPROVAL.sql` | Jalankan SEKALI di Supabase SQL Editor (kolom `approved_at`, trigger pending, RLS) |
| `db/FIX-VENDOR-IMAGES.sql` | Jalankan SEKALI (kolom `logo_url`/`collage_url` + bucket `vendor-images`) |

File lain TIDAK berubah — jangan ditimpa.

---

## 2. Akar masalah yang diperbaiki (penting dipahami)

### A. Klik tombol tidak pernah terjadi (bug paling sulit)
`motion.js` punya efek **ripple**: saat tombol ditekan, sebuah `<span>` disisipkan ke dalam tombol.
Span itu harusnya `position:absolute`, tetapi aturan `.btn > * { position: relative }` di `motion.css`
menimpanya — span selebar ratusan piksel ikut mengalir di flex tombol, **tombol melebar mendadak
sebelum mouse dilepas**, sehingga event `click` jatuh ke elemen pembungkus, bukan tombol.

**Perbaikan di `motion.js`:**
- Span ripple dipaksa `position: absolute` + `pointer-events: none` secara **inline** (tak bisa ditimpa CSS).
- Efek **magnetik** (tombol bergeser mengikuti kursor) dimatikan untuk semua tombol di dalam `.modal-overlay`.

### B. Vendor aktif tanpa approval
Ada baris yang bisa berstatus `approved` tanpa lewat tombol admin. Sekarang vendor hanya tayang jika
`status = 'approved'` **DAN** `is_verified = true` **DAN** `approved_at` terisi (diisi otomatis saat admin
klik Approve). Trigger database memaksa semua pendaftaran baru masuk `pending`.

### C. Badge antrean selalu 0
Badge admin membaca `localStorage`, tabel membaca Supabase. Sekarang keduanya membaca sumber yang sama.

### D. Foto unggahan tidak tersimpan
File hanya di-preview, database menyimpan gambar bawaan. Sekarang foto diunggah ke Supabase Storage
(bucket `vendor-images`); jika Storage belum siap, otomatis memakai gambar terkompresi yang disimpan
di kolom `image_url` — pengajuan tetap masuk.

### E. Form tidak tertutup / diam tanpa kabar
- Proses punya batas waktu (upload 12 dtk, simpan 15 dtk) — tidak ada lagi "pending selamanya".
- Kotak status di bawah tombol menampilkan progres/hasil secara langsung.
- Modal tertutup + form ter-reset hanya setelah data benar-benar tersimpan.
- Anti dobel-klik selama proses berjalan.

---

## 3. JANGAN UBAH (agar tidak rusak lagi)

1. **Di `motion.js`, fungsi `initRipple`:** jangan hapus dua baris inline berikut:
   ```js
   span.style.position = "absolute";
   span.style.pointerEvents = "none";
   ```
2. **Di `motion.js`, fungsi `initMagnetic`:** jangan hapus baris:
   ```js
   if (btn.closest(".modal-overlay")) return;
   ```
3. **Di `motion.css`:** jangan tambahkan `position` lain pada `.btn > *` tanpa pengecualian `.m-ripple`.
4. **Di `supabase-data.js`:** jangan hapus filter `.eq("is_verified", true).not("approved_at", "is", null)`
   pada query vendor publik — itu gerbang agar hanya vendor hasil approval yang tayang.
5. **Di database:** jangan hapus trigger `zz_force_new_vendor_pending`.

---

## 4. Checklist deploy

1. Timpa `index.html`, `supabase-data.js`, `motion.js` di hosting.
2. Di Supabase project `pledqkanjduhabruvgxx` → SQL Editor:
   jalankan `db/FIX-VENDOR-APPROVAL.sql`, lalu `db/FIX-VENDOR-IMAGES.sql` (masing-masing sekali saja).
3. Buka situs, tekan `Ctrl+Shift+R` (hard refresh).
4. Console (F12) harus menampilkan: `[BIVAK] Vendor submit build 2026-09-05-v12`.

## 5. Uji cepat 2 menit

1. Pasang iklan vendor uji dengan 2 foto → klik **Kirim** → modal tertutup, muncul status sukses.
2. Buka panel admin → vendor masuk **Antrean Vendor**.
3. Klik **Approve** (✓) → pindah ke **Vendor Aktif**.
4. Buka beranda → vendor tampil di katalog dengan foto yang diunggah.

Jika keempat langkah lolos, sistem beres. Peringatan `Multiple GoTrueClient instances` di Console
adalah normal dan boleh diabaikan (aplikasi memang memakai dua database Supabase).
