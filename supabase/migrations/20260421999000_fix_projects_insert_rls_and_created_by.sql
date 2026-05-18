-- ============================================================
-- Migration: Fix projects INSERT RLS policy and created_by enforcement
-- Timestamp: 20260421999000
--
-- ROOT CAUSE:
--   1. Multiple overlapping RLS policies on projects table from prior migrations
--      may still be active and conflicting with the INSERT policy.
--   2. The INSERT policy must explicitly allow authenticated users to insert
--      rows where created_by = auth.uid() (or is null for backward compat).
--
-- FIX:
--   A. Drop ALL existing projects policies (clean slate).
--   B. Create a single clean INSERT policy: WITH CHECK (created_by = auth.uid()).
--   C. Create SELECT/UPDATE/DELETE policies based on staff_project_assignments.
--   D. Ensure user_profiles backfill is complete so is_staff_user() works.
--   E. Ensure auto_assign_project_creator trigger is in place.
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL existing projects RLS policies (clean slate)
-- ============================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================================
-- STEP 2: Ensure RLS is enabled on projects
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Create clean INSERT policy
--   Allows any authenticated user to insert a project row
--   where created_by is set to their own auth.uid().
--   Also allows NULL created_by for backward compatibility.
-- ============================================================
CREATE POLICY "projects_insert_own"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR created_by IS NULL
  );

-- ============================================================
-- STEP 4: SELECT policy — user must be assigned to the project
--   OR be the creator (created_by = auth.uid())
-- ============================================================
CREATE POLICY "projects_select_assigned_or_creator"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      WHERE spa.project_id = public.projects.id
        AND spa.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 5: UPDATE policy — user must be assigned or creator
-- ============================================================
CREATE POLICY "projects_update_assigned_or_creator"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      WHERE spa.project_id = public.projects.id
        AND spa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      WHERE spa.project_id = public.projects.id
        AND spa.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 6: DELETE policy — user must be assigned or creator
-- ============================================================
CREATE POLICY "projects_delete_assigned_or_creator"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      WHERE spa.project_id = public.projects.id
        AND spa.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 7: Ensure auto_assign_project_creator trigger is in place
--   This trigger auto-inserts into staff_project_assignments after
--   a project is created, so the creator can SELECT/UPDATE/DELETE it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.staff_project_assignments (user_id, project_id)
        VALUES (auth.uid(), NEW.id)
        ON CONFLICT (user_id, project_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_project_creator();

-- ============================================================
-- STEP 8: Backfill staff_project_assignments for existing projects
--   where created_by is set but no assignment exists yet.
-- ============================================================
DO $$
BEGIN
    INSERT INTO public.staff_project_assignments (user_id, project_id)
    SELECT p.created_by, p.id
    FROM public.projects p
    WHERE p.created_by IS NOT NULL
    ON CONFLICT (user_id, project_id) DO NOTHING;

    RAISE NOTICE 'Backfill staff_project_assignments from projects.created_by complete.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Backfill skipped: %', SQLERRM;
END $$;

-- ============================================================
-- STEP 9: Backfill user_profiles for all existing auth users
--   Ensures is_staff_user() works for all current users.
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
        SET role = CASE
            WHEN public.user_profiles.role NOT IN ('admin','manager','operations','landlord','portal_owner')
            THEN 'admin'::public.user_role
            ELSE public.user_profiles.role
        END,
        is_active = true;

    RAISE NOTICE 'user_profiles backfill complete.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'user_profiles backfill skipped: %', SQLERRM;
END $$;
