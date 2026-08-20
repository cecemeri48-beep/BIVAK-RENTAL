/* ==========================================================================
   BIVAK - Konfigurasi Supabase
   --------------------------------------------------------------------------
   Database utama BIVAK: sqxwhfdarnzypicoamzl
   Database donasi (pintu angin): ncoueeeskzslldppsbvx
   
   Admin login TANPA password — cukup masukkan email.
   ========================================================================== */

window.BIVAK_SUPABASE = {
	url: "https://sqxwhfdarnzypicoamzl.supabase.co",
	// ⚠️ GANTI DENGAN ANON KEY BARU DARI SUPABASE DASHBOARD
	// Settings → API → anon public
	anonKey: "PASTE_NEW_ANON_KEY_HERE",
}

// Database donasi (pintu angin) — tetap di project lama
// Kunci donasi MASIH VALID, tidak perlu diganti
window.BIVAK_DONASI_SUPABASE = {
	url: "https://ncoueeeskzslldppsbvx.supabase.co",
	anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb3VlZWVza3pzbGxkcHBzYnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDYzMDYsImV4cCI6MjA5OTYyMjMwNn0.7kipA3YHkOnmofSilI8qzMFNAlYiSYPW4Gl8BR0z1W4",
}
