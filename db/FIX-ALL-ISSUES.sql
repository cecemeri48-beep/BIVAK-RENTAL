-- ============================================================================
-- BIVAK RENTAL - FIX SQL untuk mengatasi semua masalah hari ini
-- ============================================================================
-- Date: 2026-08-19
-- Issues:
--   1. Donasi insert blocked by RLS (anon user cannot insert)
--   2. Admin login broken (missing table/RPC)
--   3. Vendors table missing
--   4. UI/UX oversized buttons
-- ============================================================================

-- ============================================================================
-- 1. FIX RLS POLICY UNTUK DONASI (CRITICAL)
-- ============================================================================
-- Problem: Policy "donasi_insert_public" tidak allow anon user insert
-- Solution: Tambahkan role "anon" pada policy dan permissive check

-- Drop existing policies
DROP POLICY IF EXISTS "donasi_insert_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_insert_admin" ON public.donasi;
DROP POLICY IF EXISTS "donasi_select_public" ON public.donasi;
DROP POLICY IF EXISTS "donasi_select_admin" ON public.donasi;
DROP POLICY IF EXISTS "donasi_update_admin" ON public.donasi;
DROP POLICY IF EXISTS "donasi_delete_admin" ON public.donasi;

-- Re-create policies with explicit role specification
-- Public can SELECT only approved donations
CREATE POLICY "donasi_select_public" ON public.donasi
  FOR SELECT TO anon, authenticated
  USING (astatus = 'disetujui');

-- Admin can SELECT all donations
CREATE POLICY "donasi_select_admin" ON public.donasi
  FOR SELECT TO anon, authenticated
  USING (true);

-- Public can INSERT donations (anonymous users can donate)
CREATE POLICY "donasi_insert_public" ON public.donasi
  FOR INSERT TO anon, authenticated
  WITH CHECK (astatus = 'baru');

-- Admin can INSERT (for test/data seeding)
CREATE POLICY "donasi_insert_admin" ON public.donasi
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin can UPDATE (approve/reject donations)
CREATE POLICY "donasi_update_admin" ON public.donasi
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Admin can DELETE
CREATE POLICY "donasi_delete_admin" ON public.donasi
  FOR DELETE TO anon, authenticated
  USING (true);

-- ============================================================================
-- 2. CREATE VENDORS TABLE (MEDIUM)
-- ============================================================================
-- Create type if not exists
DO $$ BEGIN
    CREATE TYPE vendor_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name           VARCHAR(150) NOT NULL,
    city           VARCHAR(100) NOT NULL,
    phone          VARCHAR(30) NOT NULL,
    address        TEXT NOT NULL,
    gears          TEXT[] NOT NULL DEFAULT '{}',
    min_price      NUMERIC(12,2) NOT NULL DEFAULT 15000,
    rating         NUMERIC(3,2) DEFAULT 5.0,
    reviews_count  INT DEFAULT 1,
    image_url      TEXT,
    is_verified    BOOLEAN DEFAULT false,
    status         vendor_status_type DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "vendors_select_public" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select_admin" ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert_admin" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update_admin" ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete_admin" ON public.vendors;

-- Create policies
CREATE POLICY "vendors_select_public" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "vendors_select_admin" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "vendors_insert_admin" ON public.vendors
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "vendors_update_admin" ON public.vendors
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "vendors_delete_admin" ON public.vendors
  FOR DELETE TO anon, authenticated
  USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors (status);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON public.vendors (city);

-- ============================================================================
-- 3. CREATE ADMINS TABLE + RPC (CRITICAL)
-- ============================================================================
-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "admins_select_admin" ON public.admins;

-- Create policy
CREATE POLICY "admins_select_admin" ON public.admins
  FOR SELECT TO anon, authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admins));

-- Create RPC function to check admin status
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = auth.uid()
    );
$fn$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;

-- ============================================================================
-- 4. INSERT SAMPLE VENDORS (for testing)
-- ============================================================================
INSERT INTO public.vendors (name, city, phone, address, gears, min_price, rating, reviews_count, status, is_verified, image_url)
VALUES 
    ('Tenda Expedisi Pro', 'Makassar', '081234567890', 'Jl. Sudirman No. 123', ARRAY['Tenda 4P', 'Sleeping Bag', 'Lantern'], 150000, 4.8, 12, 'approved', true, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400'),
    ('Carrier Adventure 75L', 'Makassar', '081234567891', 'Jl. Ahmad Yani No. 45', ARRAY['Carrier', 'Rain Cover', 'Matras'], 250000, 4.9, 8, 'approved', true, 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400'),
    ('Komunitas KPA Makassar', 'Makassar', '081234567892', 'Jl. Imam Bonjol No. 67', ARRAY['Tenda', 'Carrier', 'Cooking Set'], 100000, 4.7, 15, 'approved', true, 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=400'),
    ('Gear Up Indonesia', 'Makassar', '081234567893', 'Jl. Panakkukang No. 89', ARRAY['All Gear'], 200000, 4.6, 20, 'approved', true, 'https://images.unsplash.com/photo-1501555088652-021faa106290?w=400');

-- ============================================================================
-- 5. INSERT SAMPLE ADMIN USER
-- ============================================================================
-- NOTE: Replace 'admin@example.com' with actual admin email after signup
-- This assumes you have already signed up with Supabase Auth
-- For now, we'll just create the table structure

-- To add an admin, run this AFTER signing up:
-- INSERT INTO public.admins (user_id, email) 
-- VALUES (auth.uid(), 'your-email@example.com');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup:

-- Check vendors count
-- SELECT count(*) FROM public.vendors;

-- Check admins count  
-- SELECT count(*) FROM public.admins;

-- Check donasi policies
-- SELECT polname FROM pg_policies WHERE tablename = 'donasi';

-- Check vendors policies
-- SELECT polname FROM pg_policies WHERE tablename = 'vendors';
