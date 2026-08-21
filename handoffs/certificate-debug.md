# Sertifikat Adopsi Pohon - Canvas Rendering Debug

**Status: BERJALAN** · Service: Certificate Feature · Diperbarui: 2026-08-21 13:45

## Sedang dikerjakan
Debug canvas rendering sertifikat yang kosong (hanya background hijau muncul, border/logo/teks tidak tampil).

## Status terakhir
- Fungsi `drawAdopsiCert()` sudah lengkap (1300+ baris code)
- Ditambahkan debug logging di setiap step drawing
- Contoh sertifikat dipanggil saat page load via `drawExampleCert()`
- Canvas element ada di `index.html` dengan ukuran 2000x1414

## Keputusan penting
1. Debug console.log ditambahkan ke `drawAdopsiCert()` untuk tracking
2. Test basic fillRect ditambahkan untuk verifikasi context 2D bekerja
3. Logo fallback ke teks "RC" jika `assets/logo.png` tidak load

## Langkah berikutnya
1. Buka https://bivak-rental.vercel.app/ di browser
2. Buka DevTools Console (F12)
3. Lihat log `[CERT]` untuk track rendering
4. Verifikasi apakah border emas, logo, dan teks muncul
5. Jika masih kosong, periksa CSS overflow/visibility pada canvas

## Jangan lakukan
- Jangan hapus debug logs sebelum fix diverifikasi
- Jangan ubah canvas size tanpa update semua koordinat drawing
- Jangan ganti `assets/logo.png` tanpa test fallback

## Related
- `NOTE_CERTIFICATE_FIX.md` - Dokumentasi lengkap
- Fix #3 - GoTrueClient + Image URL fix (sudah selesai)
