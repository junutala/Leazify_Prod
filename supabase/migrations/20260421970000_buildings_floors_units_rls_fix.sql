-- ============================================================
-- Migration: Fix RLS for buildings, floors, and units
-- Timestamp: 20260421970000
--
-- Aligns buildings, floors, and units RLS with the projects
-- table pattern established in 20260421960000:
--   INSERT  → any authenticated user (WITH CHECK (true))
--   SELECT  → staff_project_assignments EXISTS check
--   UPDATE  → staff_project_assignments EXISTS check (USING + WITH CHECK)
--   DELETE  → staff_project_assignments EXISTS check
-- ============================================================

-- ============================================================
-- BUILDINGS
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
      WHERE project_id = buildings.project_id
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
      WHERE project_id = buildings.project_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = buildings.project_id
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
      WHERE project_id = buildings.project_id
        AND user_id = auth.uid()
    )
  );

-- ============================================================
-- FLOORS
-- ============================================================

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_floors"            ON public.floors;
DROP POLICY IF EXISTS "authenticated_all_floors"    ON public.floors;
DROP POLICY IF EXISTS "tenant_view_floors"          ON public.floors;
DROP POLICY IF EXISTS "provider_view_floors"        ON public.floors;
DROP POLICY IF EXISTS "floors_insert_authenticated" ON public.floors;
DROP POLICY IF EXISTS "floors_select_staff"         ON public.floors;
DROP POLICY IF EXISTS "floors_update_staff"         ON public.floors;
DROP POLICY IF EXISTS "floors_delete_staff"         ON public.floors;
DROP POLICY IF EXISTS "floors_select_assigned"      ON public.floors;
DROP POLICY IF EXISTS "floors_update_assigned"      ON public.floors;
DROP POLICY IF EXISTS "floors_delete_assigned"      ON public.floors;

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
      WHERE b.id = floors.building_id
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
      WHERE b.id = floors.building_id
        AND spa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buildings b
      JOIN public.staff_project_assignments spa ON spa.project_id = b.project_id
      WHERE b.id = floors.building_id
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
      WHERE b.id = floors.building_id
        AND spa.user_id = auth.uid()
    )
  );

-- ============================================================
-- UNITS
-- ============================================================

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_units"            ON public.units;
DROP POLICY IF EXISTS "authenticated_all_units"    ON public.units;
DROP POLICY IF EXISTS "tenant_view_leased_units"   ON public.units;
DROP POLICY IF EXISTS "provider_view_units"        ON public.units;
DROP POLICY IF EXISTS "units_insert_authenticated" ON public.units;
DROP POLICY IF EXISTS "units_select_staff"         ON public.units;
DROP POLICY IF EXISTS "units_update_staff"         ON public.units;
DROP POLICY IF EXISTS "units_delete_staff"         ON public.units;
DROP POLICY IF EXISTS "units_select_assigned"      ON public.units;
DROP POLICY IF EXISTS "units_update_assigned"      ON public.units;
DROP POLICY IF EXISTS "units_delete_assigned"      ON public.units;

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
      SELECT 1 FROM public.properties pr
      JOIN public.staff_project_assignments spa ON spa.project_id = pr.project_id
      WHERE pr.id = units.property_id
        AND spa.user_id = auth.uid()
    )
  );

CREATE POLICY "units_update_assigned"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties pr
      JOIN public.staff_project_assignments spa ON spa.project_id = pr.project_id
      WHERE pr.id = units.property_id
        AND spa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties pr
      JOIN public.staff_project_assignments spa ON spa.project_id = pr.project_id
      WHERE pr.id = units.property_id
        AND spa.user_id = auth.uid()
    )
  );

CREATE POLICY "units_delete_assigned"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties pr
      JOIN public.staff_project_assignments spa ON spa.project_id = pr.project_id
      WHERE pr.id = units.property_id
        AND spa.user_id = auth.uid()
    )
  );
