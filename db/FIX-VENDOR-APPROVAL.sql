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
USING (status = 'approved');

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
