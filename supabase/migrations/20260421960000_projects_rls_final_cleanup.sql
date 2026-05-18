-- Drop all existing policies on public.projects
DROP POLICY IF EXISTS "authenticated_all_projects" ON public.projects;
DROP POLICY IF EXISTS "staff_all_projects" ON public.projects;
DROP POLICY IF EXISTS "tenant_view_projects" ON public.projects;
DROP POLICY IF EXISTS "provider_view_projects" ON public.projects;
DROP POLICY IF EXISTS "authenticated_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON public.projects;
DROP POLICY IF EXISTS "projects_select_staff" ON public.projects;
DROP POLICY IF EXISTS "projects_select_assigned" ON public.projects;
DROP POLICY IF EXISTS "projects_update_staff" ON public.projects;
DROP POLICY IF EXISTS "projects_update_assigned" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_staff" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_assigned" ON public.projects;

-- Recreate exactly four clean policies

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
      WHERE project_id = id
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
      WHERE project_id = id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_project_assignments
      WHERE project_id = id
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
      WHERE project_id = id
        AND user_id = auth.uid()
    )
  );
