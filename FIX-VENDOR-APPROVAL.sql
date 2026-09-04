-- BIVAK: perbaikan approval vendor + RLS
-- Jalankan sekali di Supabase SQL Editor untuk project utama BIVAK.

BEGIN;

-- Hubungkan admin berbasis email dengan UUID akun Supabase Auth.
UPDATE public.admins AS a
SET user_id = u.id
FROM auth.users AS u
WHERE lower(a.email) = lower(u.email)
  AND a.user_id IS DISTINCT FROM u.id;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins AS a
    WHERE a.user_id = auth.uid()
       OR (
         a.user_id IS NULL
         AND lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       )
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Jejak approval eksplisit. Kolom ini membedakan vendor yang benar-benar
-- disetujui lewat tombol admin dari status lama yang terlanjur "approved".
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Paksa semua pendaftaran baru masuk antrean. Nama trigger diawali "zz"
-- supaya dijalankan setelah trigger BEFORE INSERT lama jika masih ada.
CREATE OR REPLACE FUNCTION public.force_new_vendor_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  NEW.status := 'pending';
  NEW.is_verified := false;
  NEW.approved_at := NULL;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS zz_force_new_vendor_pending ON public.vendors;
CREATE TRIGGER zz_force_new_vendor_pending
BEFORE INSERT ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.force_new_vendor_pending();

-- Pertahankan enam vendor contoh bawaan sebagai vendor aktif.
UPDATE public.vendors
SET approved_at = coalesce(approved_at, updated_at, created_at, now())
WHERE status = 'approved'
  AND name IN (
    'Celebes Outdoor Rental Makassar',
    'Bawakaraeng Adventure Gowa',
    'Malino Highland Camp Gear',
    'Rammang-Rammang Outdoor Maros',
    'Toraja Highland Explorer',
    'Palopo Camp & Trail Base'
  );

-- Vendor lain yang aktif tanpa jejak approved_at dikembalikan ke antrean.
-- Ini akan memindahkan pengajuan uji seperti "Rcs.cbs" ke Antrean Vendor.
UPDATE public.vendors
SET status = 'pending', is_verified = false, approved_at = NULL, updated_at = now()
WHERE status = 'approved' AND approved_at IS NULL;

-- Bersihkan seluruh nama policy vendor yang pernah dipakai paket lama.
DROP POLICY IF EXISTS "Public Read Approved Vendors" ON public.vendors;
DROP POLICY IF EXISTS "Public Insert Vendor Request" ON public.vendors;
DROP POLICY IF EXISTS "Admin All Access Vendors" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select_public" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select_admin" ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert_admin" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_admin" ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete_admin" ON public.vendors;

CREATE POLICY "Public Read Approved Vendors"
ON public.vendors FOR SELECT TO anon, authenticated
USING (status = 'approved' AND is_verified = true AND approved_at IS NOT NULL);

CREATE POLICY "Public Insert Vendor Request"
ON public.vendors FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND is_verified = false);

CREATE POLICY "Admin All Access Vendors"
ON public.vendors FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;

COMMIT;

-- Pemeriksaan opsional setelah login admin di aplikasi:
-- SELECT public.is_admin();
-- SELECT id, name, min_price, status FROM public.vendors ORDER BY created_at DESC;
