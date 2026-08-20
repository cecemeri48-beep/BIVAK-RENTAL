-- ============================================================
-- TAMBAHKAN EMAIL ANDA SEBAGAI ADMIN BIVAK
-- ============================================================
-- 1. Ganti email di bawah dengan email yang ingin Tuan pakai
-- 2. Copy semua SQL, paste ke Supabase SQL Editor
-- 3. Klik RUN
-- ============================================================

-- Buat tabel admins (jika belum ada)
CREATE TABLE IF NOT EXISTS public.admins (
    id         SERIAL PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_unique'
    ) THEN
        ALTER TABLE public.admins ADD CONSTRAINT admins_email_unique UNIQUE (email);
    END IF;
END $$;

-- Aktifkan RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policy: semua orang bisa baca untuk cek email admin
DROP POLICY IF EXISTS "Public Read Admins Email" ON public.admins;
CREATE POLICY "Public Read Admins Email"
ON public.admins FOR SELECT
TO anon, authenticated
USING (true);

-- TAMBAHKAN EMAIL ADMIN (GANTI EMAIL DI BAWAH!)
-- Contoh: email Tuan adalah "admin@bivak.id" atau "cemeri48@gmail.com"
INSERT INTO public.admins (email)
VALUES ('admin@bivak.id')
ON CONFLICT (email) DO NOTHING;

-- VERIFIKASI
SELECT id, email, created_at FROM public.admins;
