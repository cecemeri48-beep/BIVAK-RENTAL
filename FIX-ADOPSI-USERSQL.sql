-- FIX: Make user_id nullable for anonymous users
ALTER TABLE public.adoption_requests
  ALTER COLUMN user_id DROP NOT NULL;

-- Also fix default to allow NULL
ALTER TABLE public.adoption_requests
  ALTER COLUMN user_id DROP DEFAULT;

-- Verify
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'adoption_requests'
  AND column_name = 'user_id';
