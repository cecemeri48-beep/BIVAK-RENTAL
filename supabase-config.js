/* ==========================================================================
   BIVAK - Konfigurasi Supabase
   --------------------------------------------------------------------------
   ISI DUA NILAI DI BAWAH INI, lalu simpan.

   Cara mendapatkannya:
   1. Buka dashboard Supabase project Anda
   2. Menu kiri bawah: Project Settings > Data API
   3. Salin "Project URL"        -> tempel ke url
   4. Menu: Project Settings > API Keys
   5. Salin kunci "anon public"  -> tempel ke anonKey

   AMAN: kunci "anon" memang dirancang untuk dipasang di kode publik.
   Yang melindungi data Anda adalah Row Level Security (RLS) di
   supabase-schema.sql, bukan kerahasiaan kunci ini.

   JANGAN PERNAH menempelkan kunci "service_role" di sini.
   Kunci itu melewati semua RLS dan akan membocorkan seluruh database Anda.

   Selama dua nilai ini masih kosong, situs otomatis berjalan dalam
   MODE DEMO memakai data contoh di app.js (tidak ada yang tersimpan).
   ========================================================================== */

window.BIVAK_SUPABASE = {
	url: "https://ncoueeeskzslldppsbvx.supabase.co",
	anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb3VlZWVza3pzbGxkcHBzYnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDYzMDYsImV4cCI6MjA5OTYyMjMwNn0.7kipA3YHkOnmofSilI8qzMFNAlYiSYPW4Gl8BR0z1W4",
}
