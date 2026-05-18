-- ============================================================
-- FIX: Ensure audit_logs table exists before triggers reference it
-- This migration is idempotent and safe to run multiple times.
-- It re-creates the audit_logs table if missing, then re-applies
-- the trigger functions and RLS policies from the superadmin migration.
-- ============================================================

-- ============================================================
-- STEP 1: Ensure audit_logs table exists (idempotent)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  performed_by_email TEXT,
  before_values JSONB,
  after_values JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 2: Ensure indexes exist
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ============================================================
-- STEP 3: Enable RLS and set open policies on audit_logs
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_select_authenticated"
ON public.audit_logs FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "audit_logs_insert_service_role" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_service_role"
ON public.audit_logs FOR INSERT TO service_role
WITH CHECK (true);

-- ============================================================
-- STEP 4: Re-create the audit trigger function
-- (Now that audit_logs is guaranteed to exist)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_action TEXT;
  v_before JSONB;
  v_after  JSONB;
  v_entity_id UUID;
  v_performed_by UUID;
  v_performed_by_email TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_before := NULL;
    v_after  := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_before := to_jsonb(OLD);
    v_after  := NULL;
    v_entity_id := OLD.id;
  END IF;

  v_performed_by := auth.uid();

  IF v_performed_by IS NULL THEN
    v_performed_by := public.get_superadmin_id();
  END IF;

  SELECT email INTO v_performed_by_email
  FROM public.user_profiles
  WHERE id = v_performed_by
  LIMIT 1;

  BEGIN
    INSERT INTO public.audit_logs (
      entity_type,
      entity_id,
      action,
      performed_by,
      performed_by_email,
      before_values,
      after_values,
      metadata
    ) VALUES (
      TG_TABLE_NAME,
      v_entity_id,
      v_action,
      v_performed_by,
      v_performed_by_email,
      v_before,
      v_after,
      jsonb_build_object('schema', TG_TABLE_SCHEMA, 'trigger', TG_NAME)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$func$;

-- ============================================================
-- STEP 5: Re-create the created_by / updated_by trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_set_created_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := COALESCE(auth.uid(), public.get_superadmin_id());

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := v_actor;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    BEGIN
      NEW.updated_at := now();
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$func$;

-- ============================================================
-- STEP 6: Re-attach triggers to all key tables
-- ============================================================

-- ---- projects ----
DROP TRIGGER IF EXISTS trg_projects_set_actor ON public.projects;
CREATE TRIGGER trg_projects_set_actor
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_projects_audit ON public.projects;
CREATE TRIGGER trg_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- roles ----
DROP TRIGGER IF EXISTS trg_roles_set_actor ON public.roles;
CREATE TRIGGER trg_roles_set_actor
  BEFORE INSERT OR UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_roles_audit ON public.roles;
CREATE TRIGGER trg_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- staff ----
DROP TRIGGER IF EXISTS trg_staff_set_actor ON public.staff;
CREATE TRIGGER trg_staff_set_actor
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_staff_audit ON public.staff;
CREATE TRIGGER trg_staff_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- buildings ----
DROP TRIGGER IF EXISTS trg_buildings_set_actor ON public.buildings;
CREATE TRIGGER trg_buildings_set_actor
  BEFORE INSERT OR UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_buildings_audit ON public.buildings;
CREATE TRIGGER trg_buildings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- floors ----
DROP TRIGGER IF EXISTS trg_floors_set_actor ON public.floors;
CREATE TRIGGER trg_floors_set_actor
  BEFORE INSERT OR UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_floors_audit ON public.floors;
CREATE TRIGGER trg_floors_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- units ----
DROP TRIGGER IF EXISTS trg_units_set_actor ON public.units;
CREATE TRIGGER trg_units_set_actor
  BEFORE INSERT OR UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_units_audit ON public.units;
CREATE TRIGGER trg_units_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- leases ----
DROP TRIGGER IF EXISTS trg_leases_set_actor ON public.leases;
CREATE TRIGGER trg_leases_set_actor
  BEFORE INSERT OR UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_leases_audit ON public.leases;
CREATE TRIGGER trg_leases_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- invoices ----
DROP TRIGGER IF EXISTS trg_invoices_set_actor ON public.invoices;
CREATE TRIGGER trg_invoices_set_actor
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_invoices_audit ON public.invoices;
CREATE TRIGGER trg_invoices_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- work_orders ----
DROP TRIGGER IF EXISTS trg_work_orders_set_actor ON public.work_orders;
CREATE TRIGGER trg_work_orders_set_actor
  BEFORE INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_work_orders_audit ON public.work_orders;
CREATE TRIGGER trg_work_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- maintenance_requests ----
DROP TRIGGER IF EXISTS trg_maintenance_requests_set_actor ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_set_actor
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_maintenance_requests_audit ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- service_requests ----
DROP TRIGGER IF EXISTS trg_service_requests_set_actor ON public.service_requests;
CREATE TRIGGER trg_service_requests_set_actor
  BEFORE INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_service_requests_audit ON public.service_requests;
CREATE TRIGGER trg_service_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- lease_renewals ----
DROP TRIGGER IF EXISTS trg_lease_renewals_set_actor ON public.lease_renewals;
CREATE TRIGGER trg_lease_renewals_set_actor
  BEFORE INSERT OR UPDATE ON public.lease_renewals
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_created_updated_by();

DROP TRIGGER IF EXISTS trg_lease_renewals_audit ON public.lease_renewals;
CREATE TRIGGER trg_lease_renewals_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.lease_renewals
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- tenants ----
DROP TRIGGER IF EXISTS trg_tenants_audit ON public.tenants;
CREATE TRIGGER trg_tenants_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- payments ----
DROP TRIGGER IF EXISTS trg_payments_audit ON public.payments;
CREATE TRIGGER trg_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- role_permissions ----
DROP TRIGGER IF EXISTS trg_role_permissions_audit ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ---- staff_role_assignments ----
DROP TRIGGER IF EXISTS trg_staff_role_assignments_audit ON public.staff_role_assignments;
CREATE TRIGGER trg_staff_role_assignments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.staff_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ============================================================
-- DONE
-- audit_logs table is now guaranteed to exist.
-- All trigger functions and triggers have been re-applied.
-- ============================================================
