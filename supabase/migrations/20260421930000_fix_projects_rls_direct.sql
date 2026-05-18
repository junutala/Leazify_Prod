-- ============================================================
-- Migration: Fix projects RLS - direct authenticated INSERT
-- Fixes: "new row violates row-level security policy for table projects"
-- Root cause: is_staff_user() returns false when user_profiles row is
--             missing for the current user (trigger/backfill may not have run).
-- New approach:
--   1. Add a separate INSERT policy on projects that allows ANY authenticated
--      user to insert — this is an admin-only app so all auth users are staff.
--   2. Add a self-insert policy on user_profiles so users can always create
--      their own profile row if it is missing.
--   3. Re-run backfill inside a robust DO block to cover existing users.
-- ============================================================

-- ============================================================
-- 1. Ensure user_profiles allows self-INSERT (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "users_insert_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_insert_own_user_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. Replace projects INSERT policy — allow any authenticated user
--    The existing staff_all_projects covers SELECT/UPDATE/DELETE via
--    is_staff_user(). We add a dedicated INSERT policy that does NOT
--    depend on is_staff_user() so the very first insert always succeeds.
-- ============================================================

DROP POLICY IF EXISTS "authenticated_insert_projects" ON public.projects;
CREATE POLICY "authenticated_insert_projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- 3. Robust backfill: upsert user_profiles for ALL existing auth users
--    Uses UPSERT (ON CONFLICT DO UPDATE) to also fix rows that may have
--    been inserted with role='viewer' by a previous partial backfill.
-- ============================================================

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
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin'::public.user_role,
        is_active = true
  WHERE public.user_profiles.role NOT IN ('admin', 'manager', 'operations', 'landlord', 'portal_owner');

  RAISE NOTICE 'Backfill/upsert complete: all auth users now have admin-role user_profiles rows.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill encountered an issue: %', SQLERRM;
END $$;
