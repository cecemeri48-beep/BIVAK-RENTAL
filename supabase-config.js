/* ==========================================================================
   BIVAK - Konfigurasi Supabase
   --------------------------------------------------------------------------
   Database utama BIVAK: sqxwhfdarnzypicoamzl
   Database donasi (pintu angin): ncoueeeskzslldppsbvx
   
   Admin login TANPA password — cukup masukkan email.
   ========================================================================== */

window.BIVAK_SUPABASE = {
	url: "https://sqxwhfdarnzypicoamzl.supabase.co",
	// ⚠️ GANTI ANON KEY INI DENGAN KEY BARU DARI SUPABASE DASHBOARD
	// Settings → API → anon public
	anonKey: "PASTE_YOUR_NEW_ANON_KEY_DISINI",
}

// Database donasi (pintu angin) — tetap di project lama
window.BIVAK_DONASI_SUPABASE = {
	url: "https://ncoueeeskzslldppsbvx.supabase.co",
	// ⚠️ GANTI JUGA JIKA PERLU
	anonKey: "PASTE_YOUR_OLD_ANON_KEY_DISINI",
}
