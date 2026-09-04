-- ============================================================
-- TAMBAHKAN EMAIL ADMIN KE DATABASE
-- ============================================================
-- Copy semua SQL di bawah, paste ke Supabase SQL Editor, RUN
-- ============================================================

-- 1. Pastikan tabel admins ada
CREATE TABLE IF NOT EXISTS public.admins (
    id         SERIAL PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. UNIQUE constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_unique'
    ) THEN
        ALTER TABLE public.admins ADD CONSTRAINT admins_email_unique UNIQUE (email);
    END IF;
END $$;

-- 3. Aktifkan RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 4. Policy: semua orang bisa baca (diperlukan untuk email-only login)
DROP POLICY IF EXISTS "Public Read Admins Email" ON public.admins;
CREATE POLICY "Public Read Admins Email"
ON public.admins FOR SELECT
TO anon, authenticated
USING (true);

-- 5. TAMBAHKAN EMAIL ADMIN (GANTI EMAIL DI BAWAH!)
INSERT INTO public.admins (email)
VALUES ('cecemeri48@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 6. VERIFIKASI - harus muncul 1 baris
SELECT id, email, created_at FROM public.admins;
