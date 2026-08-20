-- ============================================================
-- ADOPSI POHON BIVAK — Cloned from Bawakaraeng Hub
-- Database: Pintu Angin (ncoueskzslldppsbvx)
-- ============================================================
-- Fitur: Publik bisa ajukan adopsi pohon, admin bisa verifikasi
--        dan terbitkan kode adopsi. Admin Pintu Angin & BIVAK
--        bisa sama2 verifikasi (alur sama dengan donasi).
-- ============================================================

-- 1. Buat tabel adoption_requests
CREATE TABLE IF NOT EXISTS public.adoption_requests (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null check (char_length(customer_name) between 1 and 120),
    package_name text not null,
    amount integer not null check (amount > 0),
    quantity integer not null check (quantity > 0),
    whatsapp text,
    status text not null default 'menunggu_bukti' check (status in ('menunggu_bukti','terverifikasi','ditolak')),
    adoption_code text unique,
    created_at timestamptz not null default now(),
    verified_at timestamptz
);

-- 2. Enable RLS
ALTER TABLE public.adoption_requests ENABLE ROW LEVEL SECURITY;

-- 3. Drop policy lama
DROP POLICY IF EXISTS "adoption user creates" ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption user reads own" ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption admin reads" ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption admin updates" ON public.adoption_requests;
DROP POLICY IF EXISTS "adoption admin deletes" ON public.adoption_requests;

-- 4. Policy: Publik bisa INSERT (submit pengajuan)
CREATE POLICY "adoption_insert_public" ON public.adoption_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 5. Policy: Admin bisa SELECT semua (termasuk menunggu & verifikasi)
CREATE POLICY "adoption_select_all" ON public.adoption_requests
  FOR SELECT TO anon, authenticated
  USING (true);

-- 6. Policy: Admin bisa UPDATE (verifikasi & terbitkan kode)
CREATE POLICY "adoption_update_admin" ON public.adoption_requests
  FOR UPDATE TO anon, authenticated
  USING (true);

-- 7. Policy: Admin bisa DELETE (hapus yang sudah selesai)
CREATE POLICY "adoption_delete_admin" ON public.adoption_requests
  FOR DELETE TO anon, authenticated
  USING (true);

-- 8. Index
CREATE INDEX IF NOT EXISTS adoption_requests_status_idx ON public.adoption_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS adoption_requests_code_idx ON public.adoption_requests(adoption_code);

-- 9. Verifikasi
SELECT id, customer_name, package_name, amount, quantity, status, adoption_code, created_at
FROM public.adoption_requests
ORDER BY created_at DESC;
