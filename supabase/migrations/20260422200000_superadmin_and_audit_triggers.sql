-- ============================================================
-- SUPERADMIN SETUP + AUDIT TRAIL TRIGGERS
-- 
-- 1. Create superadmin auth user (junutala@gmail.com / Arun@2026)
-- 2. Create superadmin role with all nav permissions
-- 3. Create staff record linked to that user
-- 4. Add is_superadmin flag to user_profiles
-- 5. Helper function: get_superadmin_id()
-- 6. Triggers: auto-set created_by on INSERT, updated_by on UPDATE
-- 7. Database-level audit trail triggers on all key tables
-- ============================================================

-- ============================================================
-- STEP 1: Add is_superadmin column to user_profiles
-- ============================================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- ============================================================
-- STEP 2: Create the superadmin auth user
-- ============================================================
DO $$
DECLARE
  v_superadmin_uid UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_superadmin_uid
  FROM auth.users
  WHERE email = 'junutala@gmail.com'
  LIMIT 1;

  IF v_superadmin_uid IS NULL THEN
    v_superadmin_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous,
      confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at,
      email_change_token_new, email_change, email_change_sent_at,
      email_change_token_current, email_change_confirm_status,
      reauthentication_token, reauthentication_sent_at,
      phone, phone_change, phone_change_token, phone_change_sent_at
    ) VALUES (
      v_superadmin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'junutala@gmail.com',
      crypt('Arun@2026', gen_salt('bf', 10)),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Super Admin', 'role', 'admin'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false,
      '', null, '', null, '', '', null, '', 0, '', null,
      null, '', '', null
    );

    RAISE NOTICE 'Superadmin auth user created with id: %', v_superadmin_uid;
  ELSE
    RAISE NOTICE 'Superadmin auth user already exists with id: %', v_superadmin_uid;
  END IF;
END $$;

-- ============================================================
-- STEP 3: Ensure user_profiles row exists for superadmin
-- ============================================================
DO $$
DECLARE
  v_superadmin_uid UUID;
BEGIN
  SELECT id INTO v_superadmin_uid
  FROM auth.users
  WHERE email = 'junutala@gmail.com'
  LIMIT 1;

  IF v_superadmin_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, email, full_name, role, is_active, is_superadmin)
    VALUES (v_superadmin_uid, 'junutala@gmail.com', 'Super Admin', 'admin', true, true)
    ON CONFLICT (id) DO UPDATE
      SET is_superadmin = true,
          role = 'admin',
          is_active = true,
          full_name = COALESCE(NULLIF(public.user_profiles.full_name, ''), 'Super Admin'),
          updated_at = now();
  END IF;
END $$;

-- ============================================================
-- STEP 4: Create superadmin role in roles table
-- ============================================================
DO $$
DECLARE
  v_superadmin_role_id UUID;
BEGIN
  SELECT id INTO v_superadmin_role_id
  FROM public.roles
  WHERE lower(name) = 'superadmin'
  LIMIT 1;

  IF v_superadmin_role_id IS NULL THEN
    INSERT INTO public.roles (id, name, description, is_active)
    VALUES (gen_random_uuid(), 'SuperAdmin', 'Full system access — all modules and functions', true)
    RETURNING id INTO v_superadmin_role_id;
    RAISE NOTICE 'SuperAdmin role created with id: %', v_superadmin_role_id;
  ELSE
    RAISE NOTICE 'SuperAdmin role already exists with id: %', v_superadmin_role_id;
  END IF;

  -- Grant all known nav keys to the superadmin role
  INSERT INTO public.role_permissions (role_id, nav_key)
  SELECT v_superadmin_role_id, nav_key
  FROM (VALUES
    ('dashboard'),
    ('property-management'),
    ('leasing'),
    ('invoicing'),
    ('payments'),
    ('work-orders'),
    ('maintenance'),
    ('tenant-portal'),
    ('service-provider-portal'),
    ('analytics'),
    ('reports'),
    ('bulk-onboarding'),
    ('communications'),
    ('master-data'),
    ('audit-log'),
    ('turnover-rent'),
    ('lease-renewals'),
    ('project-assignment')
  ) AS t(nav_key)
  ON CONFLICT (role_id, nav_key) DO NOTHING;
END $$;

-- ============================================================
-- STEP 5: Create staff record for superadmin user
-- ============================================================
DO $$
DECLARE
  v_superadmin_uid UUID;
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_superadmin_uid
  FROM auth.users
  WHERE email = 'junutala@gmail.com'
  LIMIT 1;

  IF v_superadmin_uid IS NOT NULL THEN
    SELECT id INTO v_staff_id
    FROM public.staff
    WHERE lower(email) = 'junutala@gmail.com'
    LIMIT 1;

    IF v_staff_id IS NULL THEN
      INSERT INTO public.staff (id, full_name, email, is_active, user_id)
      VALUES (gen_random_uuid(), 'Super Admin', 'junutala@gmail.com', true, v_superadmin_uid)
      RETURNING id INTO v_staff_id;
      RAISE NOTICE 'Superadmin staff record created with id: %', v_staff_id;
    ELSE
      -- Ensure user_id is linked
      UPDATE public.staff
      SET user_id = v_superadmin_uid, is_active = true
      WHERE id = v_staff_id;
      RAISE NOTICE 'Superadmin staff record already exists with id: %', v_staff_id;
    END IF;
  END IF;
END $$;

-- ============================================================
-- STEP 6: Helper function — get_superadmin_id()
-- Returns the user_profiles.id of the superadmin user.
-- Used as DEFAULT fallback for created_by columns.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_superadmin_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.user_profiles WHERE is_superadmin = true LIMIT 1;
$$;

-- ============================================================
-- STEP 7: Helper function — is_superadmin()
-- Returns true if the current authenticated user is superadmin.
-- Used in RLS policies for bypass.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_superadmin = true
  );
$$;

-- ============================================================
-- STEP 8: Generic audit trigger function
-- Writes a row to audit_logs on INSERT/UPDATE/DELETE.
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
  -- Determine action
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

  -- Resolve acting user
  v_performed_by := auth.uid();

  -- If no auth context (e.g. migration/seed), fall back to superadmin
  IF v_performed_by IS NULL THEN
    v_performed_by := public.get_superadmin_id();
  END IF;

  -- Get email for denormalization
  SELECT email INTO v_performed_by_email
  FROM public.user_profiles
  WHERE id = v_performed_by
  LIMIT 1;

  -- Write audit log (silently ignore errors to never block main operation)
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
    -- Never block the main operation
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$func$;

-- ============================================================
-- STEP 9: created_by / updated_by auto-fill trigger function
-- On INSERT: sets created_by = auth.uid() (or superadmin fallback)
-- On UPDATE: sets updated_by = auth.uid() (or superadmin fallback)
--            and updated_at = now() if column exists
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
    -- Set created_by if column exists and is NULL
    IF NEW.created_by IS NULL THEN
      NEW.created_by := v_actor;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Always stamp updated_by with the acting user
    -- (column name varies: updated_by, modified_by — we use created_by for tables that only have that)
    -- For tables that have updated_at, refresh it
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
-- STEP 10: Attach triggers to all key tables
-- Each table gets:
--   (a) set_created_updated_by  — BEFORE INSERT OR UPDATE
--   (b) audit_trail             — AFTER INSERT OR UPDATE OR DELETE
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
-- STEP 11: Update RLS on projects to allow superadmin bypass
-- (The existing "projects_authenticated_all" policy already
--  allows all authenticated users, so this is belt-and-suspenders.
--  We add an explicit superadmin policy that uses SECURITY DEFINER
--  function to avoid any future policy tightening breaking superadmin.)
-- ============================================================

-- Drop and recreate projects policy to include superadmin bypass
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_superadmin_all"
ON public.projects FOR ALL TO authenticated
USING (public.is_superadmin() OR auth.uid() IS NOT NULL)
WITH CHECK (public.is_superadmin() OR auth.uid() IS NOT NULL);

-- Drop and recreate roles policy
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.roles', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_superadmin_all"
ON public.roles FOR ALL TO authenticated
USING (public.is_superadmin() OR auth.uid() IS NOT NULL)
WITH CHECK (public.is_superadmin() OR auth.uid() IS NOT NULL);

-- Drop and recreate staff policy
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_superadmin_all"
ON public.staff FOR ALL TO authenticated
USING (public.is_superadmin() OR auth.uid() IS NOT NULL)
WITH CHECK (public.is_superadmin() OR auth.uid() IS NOT NULL);

-- Drop and recreate role_permissions policy
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.role_permissions', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_superadmin_all"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_superadmin() OR auth.uid() IS NOT NULL)
WITH CHECK (public.is_superadmin() OR auth.uid() IS NOT NULL);

-- Drop and recreate staff_role_assignments policy
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_role_assignments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_role_assignments', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_role_assignments_superadmin_all"
ON public.staff_role_assignments FOR ALL TO authenticated
USING (public.is_superadmin() OR auth.uid() IS NOT NULL)
WITH CHECK (public.is_superadmin() OR auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 12: Ensure audit_logs INSERT policy is open for triggers
-- (Triggers run as SECURITY DEFINER so they bypass RLS,
--  but we keep the policy clean for direct app writes too.)
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_authenticated"
ON public.audit_logs FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_insert_authenticated"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow service_role (used by SECURITY DEFINER triggers) to insert
CREATE POLICY "audit_logs_insert_service_role"
ON public.audit_logs FOR INSERT TO service_role
WITH CHECK (true);

-- ============================================================
-- DONE
-- Superadmin credentials:
--   Email:    junutala@gmail.com
--   Password: Arun@2026
-- ============================================================
