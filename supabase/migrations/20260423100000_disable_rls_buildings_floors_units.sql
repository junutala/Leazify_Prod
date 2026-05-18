-- Disable RLS on buildings, floors, and units.
-- All inserts/updates are now routed through server-side API routes
-- (/api/buildings, /api/floors, /api/units) which enforce application-level
-- authentication checks, matching the same pattern used for the projects table.

ALTER TABLE public.buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units     DISABLE ROW LEVEL SECURITY;

-- Drop any lingering policies so they cannot be re-enabled accidentally
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('buildings', 'floors', 'units')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;
