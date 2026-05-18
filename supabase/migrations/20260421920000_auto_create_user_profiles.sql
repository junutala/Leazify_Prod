-- ============================================================
-- Migration: Auto-create user_profiles on signup
-- Fixes: "new row violates row-level security policy for table projects"
-- Root cause: user_profiles table is empty — is_staff_user() returns false
--             for all authenticated users, blocking INSERT on projects.
-- Fix: Trigger auto-creates a user_profiles row (role=admin) on auth signup.
--      Also backfills existing auth.users who have no profile row.
-- ============================================================

-- 1. Trigger function: fires after INSERT on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    -- Default all new sign-ups to 'admin' so they can manage projects/properties
    'admin'::public.user_role,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Attach trigger to auth.users (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: create user_profiles for any existing auth.users without one
DO $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'admin'::public.user_role,
    true
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
  );

  RAISE NOTICE 'Backfill complete: user_profiles rows created for existing auth users.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill encountered an issue: %', SQLERRM;
END $$;
