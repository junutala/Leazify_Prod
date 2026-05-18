-- ============================================================
-- Migration: 20260423000000_fix_buildings_rls_insert.sql
--
-- ROOT CAUSE:
--   "new row violates row-level security policy for table buildings"
--   The buildings table INSERT policy may have been left in a
--   restrictive state (requiring project membership) from an
--   earlier migration that was not fully overridden.
--
-- FIX:
--   Definitively drop ALL existing policies on buildings, floors,
--   and units, then re-create a single permissive FOR ALL policy
--   that allows any authenticated user to perform all operations.
--   This matches the intent of 20260422100000_definitive_rls_open_authenticated.sql
--   and ensures the policy is correct regardless of prior state.
-- ============================================================

-- ============================================================
-- BUILDINGS: Drop all existing policies and re-create open policy
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'buildings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.buildings', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buildings_authenticated_all"
ON public.buildings
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FLOORS: Drop all existing policies and re-create open policy
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'floors' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.floors', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "floors_authenticated_all"
ON public.floors
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- UNITS: Drop all existing policies and re-create open policy
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'units' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.units', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_authenticated_all"
ON public.units
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
