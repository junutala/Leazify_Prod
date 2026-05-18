-- Migration: 20260421980000_auto_assign_project_creator.sql
-- Purpose: Auto-assign the project creator to staff_project_assignments on INSERT,
--          and backfill existing users × projects combinations.

-- ============================================================
-- 1. Trigger Function: auto_assign_project_creator
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

-- ============================================================
-- 2. Trigger: on_project_created on public.projects
-- ============================================================
DROP TRIGGER IF EXISTS on_project_created ON public.projects;

CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_project_creator();

-- ============================================================
-- 3. Backfill: assign all existing auth.users to all existing projects
-- ============================================================
INSERT INTO public.staff_project_assignments (user_id, project_id)
SELECT au.id AS user_id, p.id AS project_id
FROM auth.users au
CROSS JOIN public.projects p
ON CONFLICT (user_id, project_id) DO NOTHING;
