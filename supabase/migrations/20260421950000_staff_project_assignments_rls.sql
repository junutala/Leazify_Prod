-- Migration: staff_project_assignments table + revised projects RLS policies
-- Timestamp: 20260421950000

-- ============================================================
-- 1. Create staff_project_assignments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_project_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, project_id)
);

-- Indexes on both FK columns
CREATE INDEX IF NOT EXISTS idx_staff_project_assignments_user_id
    ON public.staff_project_assignments (user_id);

CREATE INDEX IF NOT EXISTS idx_staff_project_assignments_project_id
    ON public.staff_project_assignments (project_id);

-- Enable RLS
ALTER TABLE public.staff_project_assignments ENABLE ROW LEVEL SECURITY;

-- Basic policy: authenticated users can manage their own assignments
DROP POLICY IF EXISTS "staff_assignments_manage_own" ON public.staff_project_assignments;
CREATE POLICY "staff_assignments_manage_own"
    ON public.staff_project_assignments
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. Drop all existing policies on public.projects
-- ============================================================
DROP POLICY IF EXISTS "staff_all_projects"              ON public.projects;
DROP POLICY IF EXISTS "authenticated_all_projects"      ON public.projects;
DROP POLICY IF EXISTS "authenticated_insert_projects"   ON public.projects;
DROP POLICY IF EXISTS "projects_insert_authenticated"   ON public.projects;
DROP POLICY IF EXISTS "projects_select_staff"           ON public.projects;
DROP POLICY IF EXISTS "projects_update_staff"           ON public.projects;
DROP POLICY IF EXISTS "projects_delete_staff"           ON public.projects;

-- ============================================================
-- 3. Create four new operation-specific policies on public.projects
-- ============================================================

-- INSERT: any authenticated user may create a project
DROP POLICY IF EXISTS "projects_insert_authenticated" ON public.projects;
CREATE POLICY "projects_insert_authenticated"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- SELECT: only users assigned to the project via staff_project_assignments
DROP POLICY IF EXISTS "projects_select_assigned" ON public.projects;
CREATE POLICY "projects_select_assigned"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.staff_project_assignments spa
            WHERE spa.project_id = projects.id
              AND spa.user_id = auth.uid()
        )
    );

-- UPDATE: only users assigned to the project via staff_project_assignments
DROP POLICY IF EXISTS "projects_update_assigned" ON public.projects;
CREATE POLICY "projects_update_assigned"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.staff_project_assignments spa
            WHERE spa.project_id = projects.id
              AND spa.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.staff_project_assignments spa
            WHERE spa.project_id = projects.id
              AND spa.user_id = auth.uid()
        )
    );

-- DELETE: only users assigned to the project via staff_project_assignments
DROP POLICY IF EXISTS "projects_delete_assigned" ON public.projects;
CREATE POLICY "projects_delete_assigned"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.staff_project_assignments spa
            WHERE spa.project_id = projects.id
              AND spa.user_id = auth.uid()
        )
    );
