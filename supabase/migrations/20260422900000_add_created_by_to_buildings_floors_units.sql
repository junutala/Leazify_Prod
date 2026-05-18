-- ============================================================
-- Migration: 20260422900000_add_created_by_to_buildings_floors_units.sql
--
-- ROOT CAUSE:
--   The trigger fn_set_created_updated_by() fires BEFORE INSERT on
--   buildings, floors, and units and tries to set NEW.created_by.
--   These tables do not have a created_by column, causing:
--   "record new has no field created_by"
--
-- FIX:
--   Add nullable created_by UUID column (FK → user_profiles) to
--   buildings, floors, and units so the trigger can populate it.
-- ============================================================

-- ---- buildings ----
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- ---- floors ----
ALTER TABLE public.floors
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- ---- units ----
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- ============================================================
-- Backfill: set created_by to superadmin for any existing rows
-- that were inserted before this column existed.
-- ============================================================
DO $$
DECLARE
  v_superadmin_id UUID;
BEGIN
  SELECT id INTO v_superadmin_id
  FROM public.user_profiles
  WHERE is_superadmin = true
  LIMIT 1;

  IF v_superadmin_id IS NOT NULL THEN
    UPDATE public.buildings SET created_by = v_superadmin_id WHERE created_by IS NULL;
    UPDATE public.floors     SET created_by = v_superadmin_id WHERE created_by IS NULL;
    UPDATE public.units      SET created_by = v_superadmin_id WHERE created_by IS NULL;
    RAISE NOTICE 'Backfilled created_by on buildings/floors/units with superadmin id: %', v_superadmin_id;
  ELSE
    RAISE NOTICE 'No superadmin found — skipping backfill';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill skipped: %', SQLERRM;
END $$;
