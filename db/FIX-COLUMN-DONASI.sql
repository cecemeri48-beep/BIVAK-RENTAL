-- ============================================================
-- FIX COLUMN DONASI PINTU ANGIN → BIVAK COMPATIBLE
-- ============================================================
-- File ini AMAN dijalankan ulang berkali-kali.
-- Hanya menambahkan kolom baru yang belum ada, TIDAK menghapus data.
-- Jalankan sekali saja di Supabase SQL Editor → Run semua.

-- 1. Tambah kolom email (jika belum ada)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'donasi'
          AND column_name = 'email'
    ) THEN
        ALTER TABLE public.donasi ADD COLUMN email TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- 2. Tambah kolom source (jika belum ada)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'donasi'
          AND column_name = 'source'
    ) THEN
        ALTER TABLE public.donasi ADD COLUMN source TEXT NOT NULL DEFAULT 'bivak';
    END IF;
END $$;

-- 3. Update semua baris lama: source = 'pintu_angin'
--    (supaya bisa dibedakan mana dari BIVAK vs Pintu Angin langsung)
UPDATE public.donasi SET source = 'pintu_angin' WHERE source IS NULL OR source = '';

-- 4. Seed data contoh donasi (opsional, tambah jika ada)
INSERT INTO public.donasi (nama, email, amt, source, astatus) VALUES
('Andi Mappanyukki',      'andi@example.com', 10000000, 'pintu_angin', 'disetujui'),
('Komunitas Pencinta Alam Makassar', '', 7500000, 'pintu_angin', 'disetujui'),
('Nurul Fadhilah',        'nurul@example.com', 5000000, 'pintu_angin', 'disetujui'),
('Baso Dg. Nassa',        '', 5000000, 'pintu_angin', 'disetujui'),
('Rina Kartika',          'rina@example.com', 3500000, 'pintu_angin', 'disetujui')
ON CONFLICT DO NOTHING;

-- 5. Verifikasi kolom sekarang
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'donasi'
ORDER BY ordinal_position;

-- 6. Verifikasi isi tabel
SELECT id, nama, email, amt, source, astatus, created_at
FROM public.donasi
ORDER BY created_at DESC
LIMIT 10;
