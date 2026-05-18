-- ============================================================
-- Migration: 20260423200000_make_units_property_id_nullable.sql
--
-- ROOT CAUSE:
--   units.property_id is defined as NOT NULL in the base schema
--   (20260419000000_propflow_base_schema.sql), but the application
--   uses the floor_id → building_id → project_id hierarchy.
--   When adding units via AddUnitModal, only floor_id is provided,
--   causing: "null value in column property_id violates not-null constraint"
--
-- FIX:
--   Drop the NOT NULL constraint on units.property_id so units can
--   be inserted with only floor_id (the correct hierarchy).
-- ============================================================

ALTER TABLE public.units
  ALTER COLUMN property_id DROP NOT NULL;
