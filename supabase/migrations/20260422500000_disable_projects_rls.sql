-- Disable RLS entirely on projects table and drop all existing policies.
-- Access control is now handled at the application level.

-- Drop ALL existing policies on projects (idempotent)
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
    END LOOP;
END $$;

-- Disable RLS on projects table
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
