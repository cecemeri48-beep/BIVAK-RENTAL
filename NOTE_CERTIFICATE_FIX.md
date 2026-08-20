# Catatan Proyek BIVAK-RENTAL - Sertifikat Adopsi Pohon

**Tanggal: 2026-08-21**
**Status: BELUM SELESAI**

---

## MASALAH UTAMA

### 1. Tampilan Sertifikat Kosong (CRITICAL)
Dari screenshot 2026-08-21 01:47, sertifikat menampilkan:
- ✅ Background hijau gradient (berhasil)
- ✅ Circular pattern di background (berhasil)
- ❌ Border emas (tidak muncul)
- ❌ Logo RCS.CBS (tidak muncul)
- ❌ Teks "SERTIFIKAT ADOPSI POHON" (tidak muncul)
- ❌ Nama penerima (tidak muncul)
- ❌ Informasi lainnya (tidak muncul)

**Diagnosa Awal:**
- Canvas memiliki ukuran 2000x1414 (sudah benar)
- Fungsi `drawAdopsiCert()` dipanggil dengan benar
- Tapi semua elemen setelah background tidak muncul
- Kemungkinan: masalah dengan context 2D, clipping, atau error silent

**Yang Perlu Diperiksa Besok:**
1. Apakah canvas 2D context bekerja normal?
2. Apakah ada error JavaScript di console?
3. Apakah semua drawing calls executed dengan benar?
4. Apakah ada masalah dengan CSS yang menutupi canvas?
5. Apakah ukuran canvas di DOM sesuai dengan atribut width/height?

---

### 2. Download Sertifikat Tidak Berfungsi
**Status:** Belum bisa di-download

**Langkah yang Sudah Ada di Kode:**
- `downloadAdopsiCert()` function sudah ada di line 774-815
- Membuat high-res canvas (2000x1414)
- Memanggil `drawAdopsiCert(hiCv, data)`
- Menggunakan `hiCv.toBlob()` untuk convert ke PNG
- Membuat anchor tag dan trigger click

**Yang Perlu Diperiksa:**
1. Apakah fungsi dipanggil dengan benar dari button onclick?
2. Apakah ada error di browser console saat klik download?
3. Apakah `window._validAdopsiCode` ter-set dengan benar?
4. Apakah `name` input terisi?

---

## FILE YANG TERKAIT

### Frontend
- `E:\OpenCode\BIVAK-RENTAL\index.html`
  - Line 297-312: Form dan canvas sertifikat
  - Canvas ID: `certCanvas` (width=2000, height=1414)
  - Canvas ID: `exampleCertCanvas` (width=2000, height=1414)

- `E:\OpenCode\BIVAK-RENTAL\supabase-data.js`
  - Line 750-772: `updateCertPreview()` function
  - Line 774-815: `downloadAdopsiCert()` function
  - Line 932-1111: `drawAdopsiCert()` function (MAIN DRAWING)
  - Line 1272-1284: `drawExampleCert()` function

### Helper Functions (di supabase-data.js)
- `drawAdopsiCert(cv, data)` - Main drawing function
- `downloadAdopsiCert()` - Download handler
- `updateCertPreview(adopsiData)` - Preview updater
- `_loadCertLogo(cb)` - Logo loader
- `_rr(ctx, x, y, w, h, r)` - Rounded rectangle
- `_wrap(ctx, text, cx, y, maxW, lh)` - Text wrapping
- `_seal(ctx, cx, cy, R)` - Gold seal drawing

---

## TUGAS BESOK

### Priority 1: Debug Canvas Rendering
1. **Tambahkan console.log** di dalam `drawAdopsiCert()` untuk tracking:
   ```javascript
   console.log('drawAdopsiCert called', { W, H, data });
   console.log('ctx is null?', !ctx);
   ```

2. **Periksa canvas element**:
   ```javascript
   var cv = document.getElementById('certCanvas');
   console.log('Canvas element:', cv);
   console.log('Canvas size:', cv.width, cv.height);
   console.log('Canvas style:', window.getComputedStyle(cv).width);
   ```

3. **Test basic drawing**:
   - Tambah rectangle sederhana di awal fungsi
   - Verifikasi apakah ctx.fillRect bekerja

4. **Periksa CSS/HTML**:
   - Apakah canvas tertutup elemen lain?
   - Apakah ada `display: none` atau `visibility: hidden`?
   - Apakah overflow tersembunyi?

### Priority 2: Perbaiki Download Function
1. Tambah error handling:
   ```javascript
   hiCv.toBlob(function(b) {
     if (!b) {
       console.error('Blob creation failed');
       toast("error", "Gagal", "Tidak bisa membuat file sertifikat");
       return;
     }
     // ... rest of download logic
   }, 'image/png');
   ```

2. Tambah debug:
   ```javascript
   console.log('Blob created:', b.size, 'bytes');
   console.log('Download URL:', u);
   ```

### Priority 3: Verifikasi Logika Bisnis
1. Pastikan `window._validAdopsiCode` ter-set saat kode adopsi valid
2. Pastikan `window.updateCertPreview()` dipanggil saat user mengetik nama
3. Pastikan button download hanya aktif jika semua data lengkap

---

## DEBUGGING CHECKLIST

### Browser Console
- [ ] Buka DevTools (F12)
- [ ] Cek tab Console untuk error
- [ ] Cek tab Network untuk failed requests
- [ ] Test dengan input valid dan lihat output console

### Canvas Inspection
- [ ] Inspect element canvas di DevTools
- [ ] Lihat computed styles
- [ ] Cek apakah canvas punya parent dengan overflow:hidden
- [ ] Verifikasi intrinsic size vs rendered size

### Drawing Test
- [ ] Tambah debug logs di setiap step drawing
- [ ] Test dengan canvas size kecil (400x283) dulu
- [ ] Pastikan ctx.fillStyle, ctx.strokeStyle bekerja
- [ ] Test ctx.fillText sederhana

---

## CATATAN TEKNIS

### Canvas Resolution
- Intrinsic: 2000x1414 pixels
- Display: 100% width, auto height (dikelola CSS)
- Aspect Ratio: 1.414:1 (landscape)

### Drawing Order (dari atas ke bawah)
1. Background gradient hijau
2. Radial glow gold
3. Circular pattern (alpha 0.05)
4. Mountain silhouette (alpha 0.10)
5. Outer border emas (m=54, lw=9)
6. Inner border emas (m2=76, lw=2.5)
7. Diamond corners (4x)
8. Logo circle (cx, ly=196, r=90)
9. Text: "ORGANISASI PENCINTA ALAM"
10. Text: "RCS.CBS"
11. Text: "SERTIFIKAT ADOPSI POHON"
12. Decorative line + diamond
13. Text: "dengan penuh penghargaan..."
14. Text: Nama penerima (dynamic)
15. Underline nama
16. Body text (wrapped)
17. Signature lines + labels
18. Gold seal
19. Footer info (No, Tanggal, Lokasi)

---

## FILE BACKUP
Jika perlu restore:
```bash
git checkout HEAD~5 -- supabase-data.js
git checkout HEAD~5 -- index.html
```

Commit terakhir sebelum masalah: `305a506`

---

## KONTAK & REFRENSI
- Project: BIVAK-RENTAL
- Repo: https://github.com/cecemeri48-beep/BIVAK-RENTAL.git
- Local: E:\OpenCode\BIVAK-RENTAL\

---

**Next Action:** Debug canvas rendering dengan console.log dan DevTools inspection.
