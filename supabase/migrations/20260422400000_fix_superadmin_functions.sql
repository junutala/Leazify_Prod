-- ============================================================
-- FIX: Ensure get_superadmin_id() and is_superadmin() functions exist
-- These functions are referenced by fn_audit_trigger,
-- fn_set_created_updated_by, and various RLS policies.
-- This migration is idempotent and safe to run multiple times.
-- ============================================================

-- ============================================================
-- STEP 1: Ensure is_superadmin column exists on user_profiles
-- ============================================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- ============================================================
-- STEP 2: Helper function — get_superadmin_id()
-- Returns the user_profiles.id of the superadmin user.
-- Used as DEFAULT fallback for created_by columns.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_superadmin_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.user_profiles WHERE is_superadmin = true LIMIT 1;
$$;

-- ============================================================
-- STEP 3: Helper function — is_superadmin()
-- Returns true if the current authenticated user is superadmin.
-- Used in RLS policies for bypass.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_superadmin = true
  );
$$;

-- ============================================================
-- STEP 4: Ensure superadmin user_profiles row is marked correctly
-- (in case the earlier migration seeded the auth user but
--  the is_superadmin flag was not set due to a partial failure)
-- ============================================================
DO $$
DECLARE
  v_superadmin_uid UUID;
BEGIN
  SELECT id INTO v_superadmin_uid
  FROM auth.users
  WHERE email = 'junutala@gmail.com'
  LIMIT 1;

  IF v_superadmin_uid IS NOT NULL THEN
    -- Upsert user_profiles row with is_superadmin = true
    INSERT INTO public.user_profiles (id, email, full_name, role, is_active, is_superadmin)
    VALUES (v_superadmin_uid, 'junutala@gmail.com', 'Super Admin', 'admin', true, true)
    ON CONFLICT (id) DO UPDATE
      SET is_superadmin = true,
          role = 'admin',
          is_active = true,
          updated_at = now();
    RAISE NOTICE 'Superadmin user_profiles row ensured for uid: %', v_superadmin_uid;
  ELSE
    RAISE NOTICE 'Superadmin auth user not found — skipping user_profiles upsert';
  END IF;
END $$;
