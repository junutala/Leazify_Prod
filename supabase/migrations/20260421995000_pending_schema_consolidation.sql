-- ============================================================
-- Consolidation Migration: Apply all pending schema changes
-- Timestamp: 20260421995000
--
-- This migration consolidates all pending changes from:
--   20260421900000_extend_payment_terms_enum
--   20260421910000_add_lease_payment_term_columns
--   20260421920000_auto_create_user_profiles
--   20260421930000_fix_projects_rls_direct
--   20260421940000_definitive_rls_fix
--   20260421950000_staff_project_assignments_rls
--   20260421960000_projects_rls_final_cleanup
--   20260421970000_buildings_floors_units_rls_fix
--   20260421980000_auto_assign_project_creator
-- ============================================================

-- ============================================================
-- 1. EXTEND PAYMENT TERMS ENUM
-- ============================================================
ALTER TYPE public.payment_terms ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE public.payment_terms ADD VALUE IF NOT EXISTS 'half_yearly';
ALTER TYPE public.payment_terms ADD VALUE IF NOT EXISTS 'annually';

-- ============================================================
-- 2. ADD MISSING LEASE COLUMNS
-- ============================================================
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS sd_payment_term TEXT DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS turnover_payment_term TEXT DEFAULT 'monthly';

-- ============================================================
-- 3. STAFF PROJECT ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_project_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_project_assignments_user_id
    ON public.staff_project_assignments (user_id);

CREATE INDEX IF NOT EXISTS idx_staff_project_assignments_project_id
    ON public.staff_project_assignments (project_id);

ALTER TABLE public.staff_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_assignments_manage_own" ON public.staff_project_assignments;
CREATE POLICY "staff_assignments_manage_own"
    ON public.staff_project_assignments
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all assignments
DROP POLICY IF EXISTS "staff_assignments_admin_all" ON public.staff_project_assignments;
CREATE POLICY "staff_assignments_admin_all"
    ON public.staff_project_assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'portal_owner')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'portal_owner')
        )
    );

-- ============================================================
-- 4. AUTO-CREATE USER PROFILES TRIGGER
-- ============================================================
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
    'admin'::public.user_role,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users who have no profile row
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill user_profiles skipped: %', SQLERRM;
END $$;

-- ============================================================
-- 5. USER PROFILES RLS - allow self-insert
-- ============================================================
DROP POLICY IF EXISTS "users_insert_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_insert_own_user_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================
-- 6. PROJECTS RLS - final clean policies
-- ============================================================
DROP POLICY IF EXISTS "authenticated_all_projects"    ON public.projects;
DROP POLICY IF EXISTS "staff_all_projects"            ON public.projects;
DROP POLICY IF EXISTS "tenant_view_projects"          ON public.projects;
DROP POLICY IF EXISTS "provider_view_projects"        ON public.projects;
DROP POLICY IF EXISTS "authenticated_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON public.projects;
DROP POLICY IF EXISTS "projects_select_staff"         ON public.projects;
DROP POLICY IF EXISTS "projects_select_assigned"      ON public.projects;
DROP POLICY IF EXISTS "projects_update_staff"         ON public.projects;
DROP POLICY IF EXISTS "projects_update_assigned"      ON public.projects;
DROP POLICY IF EXISTS "projects_delete_staff"         ON public.projects;
DROP POLICY IF EXISTS "projects_delete_assigned"      ON public.projects;

CREATE POLICY "projects_insert_authenticated"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "projects_select_assigned"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.projects.id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_update_assigned"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.projects.id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.projects.id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_delete_assigned"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.projects.id
        AND user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. BUILDINGS RLS
-- ============================================================
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_buildings"              ON public.buildings;
DROP POLICY IF EXISTS "authenticated_all_buildings"      ON public.buildings;
DROP POLICY IF EXISTS "tenant_view_buildings"            ON public.buildings;
DROP POLICY IF EXISTS "provider_view_buildings"          ON public.buildings;
DROP POLICY IF EXISTS "buildings_insert_authenticated"   ON public.buildings;
DROP POLICY IF EXISTS "buildings_select_staff"           ON public.buildings;
DROP POLICY IF EXISTS "buildings_update_staff"           ON public.buildings;
DROP POLICY IF EXISTS "buildings_delete_staff"           ON public.buildings;
DROP POLICY IF EXISTS "buildings_select_assigned"        ON public.buildings;
DROP POLICY IF EXISTS "buildings_update_assigned"        ON public.buildings;
DROP POLICY IF EXISTS "buildings_delete_assigned"        ON public.buildings;

CREATE POLICY "buildings_insert_authenticated"
  ON public.buildings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "buildings_select_assigned"
  ON public.buildings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.buildings.project_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_update_assigned"
  ON public.buildings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.buildings.project_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.buildings.project_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_delete_assigned"
  ON public.buildings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = public.buildings.project_id
        AND user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. FLOORS RLS
-- ============================================================
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_floors"           ON public.floors;
DROP POLICY IF EXISTS "authenticated_all_floors"   ON public.floors;
DROP POLICY IF EXISTS "floors_insert_authenticated" ON public.floors;
DROP POLICY IF EXISTS "floors_select_assigned"     ON public.floors;
DROP POLICY IF EXISTS "floors_update_assigned"     ON public.floors;
DROP POLICY IF EXISTS "floors_delete_assigned"     ON public.floors;

CREATE POLICY "floors_insert_authenticated"
  ON public.floors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "floors_select_assigned"
  ON public.floors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings b
      JOIN public.staff_project_assignments spa ON spa.project_id = b.project_id
      WHERE b.id = public.floors.building_id
        AND spa.user_id = auth.uid()
    )
  );

CREATE POLICY "floors_update_assigned"
  ON public.floors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings b
      JOIN public.staff_project_assignments spa ON spa.project_id = b.project_id
      WHERE b.id = public.floors.building_id
        AND spa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buildings b
      JOIN public.staff_project_assignments spa ON spa.project_id = b.project_id
      WHERE b.id = public.floors.building_id
        AND spa.user_id = auth.uid()
    )
  );

CREATE POLICY "floors_delete_assigned"
  ON public.floors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings b
      JOIN public.staff_project_assignments spa ON spa.project_id = b.project_id
      WHERE b.id = public.floors.building_id
        AND spa.user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. UNITS RLS
-- ============================================================
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_units"           ON public.units;
DROP POLICY IF EXISTS "authenticated_all_units"   ON public.units;
DROP POLICY IF EXISTS "units_insert_authenticated" ON public.units;
DROP POLICY IF EXISTS "units_select_assigned"     ON public.units;
DROP POLICY IF EXISTS "units_update_assigned"     ON public.units;
DROP POLICY IF EXISTS "units_delete_assigned"     ON public.units;

CREATE POLICY "units_insert_authenticated"
  ON public.units
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "units_select_assigned"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      JOIN public.properties pr ON pr.project_id = spa.project_id
      WHERE pr.id = public.units.property_id
        AND spa.user_id = auth.uid()
    )
  );

CREATE POLICY "units_update_assigned"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      JOIN public.properties pr ON pr.project_id = spa.project_id
      WHERE pr.id = public.units.property_id
        AND spa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      JOIN public.properties pr ON pr.project_id = spa.project_id
      WHERE pr.id = public.units.property_id
        AND spa.user_id = auth.uid()
    )
  );

CREATE POLICY "units_delete_assigned"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments spa
      JOIN public.properties pr ON pr.project_id = spa.project_id
      WHERE pr.id = public.units.property_id
        AND spa.user_id = auth.uid()
    )
  );

-- ============================================================
-- 10. AUTO-ASSIGN PROJECT CREATOR TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.staff_project_assignments (user_id, project_id)
    VALUES (auth.uid(), NEW.id)
    ON CONFLICT (user_id, project_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_project_creator();

-- Backfill: assign all existing auth.users to all existing projects
INSERT INTO public.staff_project_assignments (user_id, project_id)
SELECT au.id AS user_id, p.id AS project_id
FROM auth.users au
CROSS JOIN public.projects p
ON CONFLICT (user_id, project_id) DO NOTHING;
