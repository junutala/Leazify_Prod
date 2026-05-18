-- ============================================================
-- FIX: fn_set_created_updated_by — safe column access
--
-- Root cause: The trigger function accessed NEW.created_by directly.
-- Tables like `roles`, `staff`, `work_orders`, `maintenance_requests`,
-- and `service_requests` do NOT have a `created_by` column, causing:
--   "record new has no field created_by"
--
-- Fix: Wrap the created_by assignment in a BEGIN/EXCEPTION block
-- so it silently skips tables that don't have that column,
-- exactly the same pattern already used for `updated_at`.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_set_created_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_actor UUID;
BEGIN
  -- Resolve acting user; fall back to superadmin if no auth context
  v_actor := COALESCE(auth.uid(), public.get_superadmin_id());

  IF TG_OP = 'INSERT' THEN
    -- Safely set created_by if the column exists and is NULL
    -- Tables without created_by (roles, staff, work_orders, etc.) are silently skipped
    BEGIN
      IF NEW.created_by IS NULL THEN
        NEW.created_by := v_actor;
      END IF;
    EXCEPTION WHEN undefined_column THEN
      NULL; -- Table has no created_by column — skip silently
    END;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Refresh updated_at if the column exists
    BEGIN
      NEW.updated_at := now();
    EXCEPTION WHEN undefined_column THEN
      NULL; -- Table has no updated_at column — skip silently
    END;
  END IF;

  RETURN NEW;
END;
$func$;
