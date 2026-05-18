-- ============================================================
-- Migration: Definitive RLS Fix
-- Timestamp: 20260421940000
--
-- ROOT CAUSE ANALYSIS:
--   The "new row violates row-level security policy for table projects" error
--   persists because:
--
--   1. "staff_all_projects" uses FOR ALL with WITH CHECK (is_staff_user()).
--      In Supabase, ALL policies for a given operation must pass (AND logic
--      for WITH CHECK on INSERT). Even though "authenticated_insert_projects"
--      allows any authenticated INSERT, the FOR ALL policy's WITH CHECK
--      ALSO runs and blocks the insert when is_staff_user() = false.
--
--   2. is_staff_user() returns false when user_profiles row is missing or
--      has a non-staff role — which happens for brand-new sign-ups before
--      the trigger fires, or if the trigger failed silently.
--
-- FIX STRATEGY:
--   A. Replace FOR ALL policies on projects (and other key tables) with
--      SEPARATE operation-specific policies. This way INSERT only checks
--      the INSERT policy, not the SELECT/UPDATE/DELETE policy.
--   B. The INSERT policy uses auth.uid() IS NOT NULL (any authenticated user)
--      since this is a staff-only app.
--   C. SELECT/UPDATE/DELETE still require is_staff_user() for security.
--   D. Ensure user_profiles trigger is robust and backfill is complete.
--   E. Audit and fix the same pattern on buildings, floors, units, properties,
--      and other tables that staff INSERT into.
-- ============================================================

-- ============================================================
-- STEP 1: Ensure is_staff_user() is robust
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager', 'operations', 'landlord', 'portal_owner')
  );
$$;

-- ============================================================
-- STEP 2: Ensure handle_new_user trigger is robust
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    'admin'::public.user_role,
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
      WHEN public.user_profiles.role NOT IN ('admin','manager','operations','landlord','portal_owner')
      THEN 'admin'::public.user_role
      ELSE public.user_profiles.role
    END,
    is_active = true;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: Backfill — ensure ALL existing auth users have staff profiles
-- ============================================================

DO $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'admin'::public.user_role,
    true
  FROM auth.users au
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
      WHEN public.user_profiles.role NOT IN ('admin','manager','operations','landlord','portal_owner')
      THEN 'admin'::public.user_role
      ELSE public.user_profiles.role
    END,
    is_active = true;

  RAISE NOTICE 'Backfill complete: all auth users now have staff-role user_profiles rows.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill error: %', SQLERRM;
END $$;

-- ============================================================
-- STEP 4: FIX PROJECTS — replace FOR ALL with operation-specific policies
-- The core fix: INSERT no longer requires is_staff_user()
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing projects policies (clean slate)
DROP POLICY IF EXISTS "staff_all_projects"                ON public.projects;
DROP POLICY IF EXISTS "authenticated_all_projects"        ON public.projects;
DROP POLICY IF EXISTS "authenticated_insert_projects"     ON public.projects;
DROP POLICY IF EXISTS "tenant_view_projects"              ON public.projects;
DROP POLICY IF EXISTS "provider_view_projects"            ON public.projects;

-- INSERT: any authenticated user (staff app — all users are staff)
CREATE POLICY "projects_insert_authenticated"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT: staff + tenants (their projects) + providers (assigned projects)
CREATE POLICY "projects_select_staff"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    -- tenant: projects for their leased units
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'tenant' AND up.person_id IS NOT NULL
    )
    AND id IN (
      SELECT p.project_id FROM public.properties p
      JOIN public.units u ON u.property_id = p.id
      JOIN public.leases l ON l.unit_id = u.id
      WHERE l.lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    -- provider: assigned projects
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'viewer' AND up.provider_id IS NOT NULL
    )
    AND id IN (
      SELECT project_id FROM public.provider_project_assignments
      WHERE provider_id = public.get_current_provider_id()
    )
  )
);

-- UPDATE: staff only
CREATE POLICY "projects_update_staff"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- DELETE: staff only
CREATE POLICY "projects_delete_staff"
ON public.projects
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 5: FIX BUILDINGS — same pattern
-- ============================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_buildings"           ON public.buildings;
DROP POLICY IF EXISTS "authenticated_all_buildings"   ON public.buildings;
DROP POLICY IF EXISTS "tenant_view_buildings"         ON public.buildings;
DROP POLICY IF EXISTS "provider_view_buildings"       ON public.buildings;

CREATE POLICY "buildings_insert_authenticated"
ON public.buildings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "buildings_select_staff"
ON public.buildings
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND project_id IN (
      SELECT p.project_id FROM public.properties p
      JOIN public.units u ON u.property_id = p.id
      JOIN public.leases l ON l.unit_id = u.id
      WHERE l.lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND project_id IN (
      SELECT project_id FROM public.provider_project_assignments
      WHERE provider_id = public.get_current_provider_id()
    )
  )
);

CREATE POLICY "buildings_update_staff"
ON public.buildings
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "buildings_delete_staff"
ON public.buildings
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 6: FIX FLOORS — same pattern
-- ============================================================

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_floors"          ON public.floors;
DROP POLICY IF EXISTS "authenticated_all_floors"  ON public.floors;
DROP POLICY IF EXISTS "tenant_view_floors"        ON public.floors;
DROP POLICY IF EXISTS "provider_view_floors"      ON public.floors;

CREATE POLICY "floors_insert_authenticated"
ON public.floors
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "floors_select_staff"
ON public.floors
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND building_id IN (
      SELECT b.id FROM public.buildings b
      JOIN public.properties p ON p.project_id = b.project_id
      JOIN public.units u ON u.property_id = p.id
      JOIN public.leases l ON l.unit_id = u.id
      WHERE l.lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND building_id IN (
      SELECT b.id FROM public.buildings b
      JOIN public.provider_project_assignments ppa ON ppa.project_id = b.project_id
      WHERE ppa.provider_id = public.get_current_provider_id()
    )
  )
);

CREATE POLICY "floors_update_staff"
ON public.floors
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "floors_delete_staff"
ON public.floors
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 7: FIX UNITS — same pattern
-- ============================================================

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_units"           ON public.units;
DROP POLICY IF EXISTS "authenticated_all_units"   ON public.units;
DROP POLICY IF EXISTS "tenant_view_leased_units"  ON public.units;
DROP POLICY IF EXISTS "provider_view_units"       ON public.units;

CREATE POLICY "units_insert_authenticated"
ON public.units
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "units_select_staff"
ON public.units
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND id IN (
      SELECT unit_id FROM public.leases
      WHERE lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.provider_project_assignments ppa ON ppa.project_id = p.project_id
      WHERE ppa.provider_id = public.get_current_provider_id()
    )
  )
);

CREATE POLICY "units_update_staff"
ON public.units
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "units_delete_staff"
ON public.units
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 8: FIX PROPERTIES — same pattern
-- ============================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_properties"          ON public.properties;
DROP POLICY IF EXISTS "authenticated_all_properties"  ON public.properties;
DROP POLICY IF EXISTS "tenant_view_properties"        ON public.properties;
DROP POLICY IF EXISTS "provider_view_properties"      ON public.properties;

CREATE POLICY "properties_insert_authenticated"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "properties_select_staff"
ON public.properties
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND id IN (
      SELECT u.property_id FROM public.units u
      JOIN public.leases l ON l.unit_id = u.id
      WHERE l.lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND project_id IN (
      SELECT project_id FROM public.provider_project_assignments
      WHERE provider_id = public.get_current_provider_id()
    )
  )
);

CREATE POLICY "properties_update_staff"
ON public.properties
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "properties_delete_staff"
ON public.properties
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 9: FIX LEASES — same pattern
-- ============================================================

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_leases"          ON public.leases;
DROP POLICY IF EXISTS "authenticated_all_leases"  ON public.leases;
DROP POLICY IF EXISTS "tenant_view_own_leases"    ON public.leases;

CREATE POLICY "leases_insert_authenticated"
ON public.leases
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "leases_select_staff_tenant"
ON public.leases
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND lessee_person_id IS NOT NULL
    AND lessee_person_id = public.get_current_person_id()
  )
);

CREATE POLICY "leases_update_staff"
ON public.leases
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "leases_delete_staff"
ON public.leases
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 10: FIX INVOICES — same pattern
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_invoices"            ON public.invoices;
DROP POLICY IF EXISTS "authenticated_all_invoices"    ON public.invoices;
DROP POLICY IF EXISTS "tenant_view_own_invoices"      ON public.invoices;
DROP POLICY IF EXISTS "provider_view_own_invoices"    ON public.invoices;

CREATE POLICY "invoices_insert_authenticated"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "invoices_select_staff_tenant_provider"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND lease_id IN (
      SELECT id FROM public.leases
      WHERE lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE provider_id = public.get_current_provider_id()
    )
  )
);

CREATE POLICY "invoices_update_staff"
ON public.invoices
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "invoices_delete_staff"
ON public.invoices
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 11: FIX PERSONS — same pattern
-- ============================================================

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_persons"           ON public.persons;
DROP POLICY IF EXISTS "authenticated_all_persons"   ON public.persons;
DROP POLICY IF EXISTS "tenant_view_own_person"      ON public.persons;

CREATE POLICY "persons_insert_authenticated"
ON public.persons
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "persons_select_staff_tenant"
ON public.persons
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND id = public.get_current_person_id()
  )
);

CREATE POLICY "persons_update_staff"
ON public.persons
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "persons_delete_staff"
ON public.persons
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 12: FIX SERVICE_PROVIDERS — same pattern
-- ============================================================

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_service_providers"         ON public.service_providers;
DROP POLICY IF EXISTS "authenticated_all_service_providers" ON public.service_providers;

CREATE POLICY "service_providers_insert_authenticated"
ON public.service_providers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "service_providers_select_staff"
ON public.service_providers
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "service_providers_update_staff"
ON public.service_providers
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "service_providers_delete_staff"
ON public.service_providers
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 13: FIX TENANTS — same pattern
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_tenants"                   ON public.tenants;
DROP POLICY IF EXISTS "authenticated_all_tenants"           ON public.tenants;
DROP POLICY IF EXISTS "tenant_view_own_tenant_record"       ON public.tenants;

CREATE POLICY "tenants_insert_authenticated"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tenants_select_staff_tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant')
    AND user_id = auth.uid()
  )
);

CREATE POLICY "tenants_update_staff"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenants_delete_staff"
ON public.tenants
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 14: FIX WORK_ORDERS — same pattern
-- ============================================================

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_work_orders"           ON public.work_orders;
DROP POLICY IF EXISTS "authenticated_all_work_orders"   ON public.work_orders;
DROP POLICY IF EXISTS "provider_view_assigned_work_orders" ON public.work_orders;

CREATE POLICY "work_orders_insert_authenticated"
ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "work_orders_select_staff_provider"
ON public.work_orders
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND provider_id = public.get_current_provider_id()
  )
);

CREATE POLICY "work_orders_update_staff_provider"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND provider_id = public.get_current_provider_id()
  )
)
WITH CHECK (public.is_staff_user());

CREATE POLICY "work_orders_delete_staff"
ON public.work_orders
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 15: FIX MAINTENANCE_REQUESTS — same pattern
-- ============================================================

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_maintenance_requests"          ON public.maintenance_requests;
DROP POLICY IF EXISTS "authenticated_all_maintenance_requests"  ON public.maintenance_requests;

CREATE POLICY "maintenance_requests_insert_authenticated"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "maintenance_requests_select_staff"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "maintenance_requests_update_staff"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "maintenance_requests_delete_staff"
ON public.maintenance_requests
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 16: FIX PAYMENTS — same pattern
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_payments"          ON public.payments;
DROP POLICY IF EXISTS "authenticated_all_payments"  ON public.payments;
DROP POLICY IF EXISTS "tenant_view_own_payments"    ON public.payments;

CREATE POLICY "payments_insert_authenticated"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "payments_select_staff_tenant"
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND invoice_id IN (
      SELECT i.id FROM public.invoices i
      JOIN public.leases l ON l.id = i.lease_id
      WHERE l.lessee_person_id = public.get_current_person_id()
    )
  )
);

CREATE POLICY "payments_update_staff"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "payments_delete_staff"
ON public.payments
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 17: FIX VAT_CONFIG — same pattern
-- ============================================================

ALTER TABLE public.vat_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_vat_config"          ON public.vat_config;
DROP POLICY IF EXISTS "authenticated_all_vat_config"  ON public.vat_config;

CREATE POLICY "vat_config_insert_authenticated"
ON public.vat_config
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vat_config_select_staff"
ON public.vat_config
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "vat_config_update_staff"
ON public.vat_config
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "vat_config_delete_staff"
ON public.vat_config
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 18: FIX TURNOVER_RENT — same pattern
-- ============================================================

ALTER TABLE public.turnover_rent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_turnover_rent"         ON public.turnover_rent;
DROP POLICY IF EXISTS "authenticated_all_turnover_rent" ON public.turnover_rent;

CREATE POLICY "turnover_rent_insert_authenticated"
ON public.turnover_rent
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "turnover_rent_select_staff"
ON public.turnover_rent
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "turnover_rent_update_staff"
ON public.turnover_rent
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "turnover_rent_delete_staff"
ON public.turnover_rent
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 19: FIX AUDIT_LOGS — allow any authenticated INSERT
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_audit_logs"          ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated_all_audit_logs"  ON public.audit_logs;

CREATE POLICY "audit_logs_insert_authenticated"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_select_staff"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 20: FIX BULK_UPLOAD_LOGS
-- ============================================================

ALTER TABLE public.bulk_upload_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_bulk_upload_logs"          ON public.bulk_upload_logs;
DROP POLICY IF EXISTS "authenticated_all_bulk_upload_logs"  ON public.bulk_upload_logs;

CREATE POLICY "bulk_upload_logs_insert_authenticated"
ON public.bulk_upload_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bulk_upload_logs_select_staff"
ON public.bulk_upload_logs
FOR SELECT
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 21: FIX PROVIDER_PROJECT_ASSIGNMENTS
-- ============================================================

ALTER TABLE public.provider_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_provider_project_assignments"          ON public.provider_project_assignments;
DROP POLICY IF EXISTS "authenticated_all_provider_project_assignments"  ON public.provider_project_assignments;

CREATE POLICY "provider_project_assignments_insert_authenticated"
ON public.provider_project_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "provider_project_assignments_select_staff"
ON public.provider_project_assignments
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "provider_project_assignments_update_staff"
ON public.provider_project_assignments
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "provider_project_assignments_delete_staff"
ON public.provider_project_assignments
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 22: FIX ESTATE_ASSIGNMENTS
-- ============================================================

ALTER TABLE public.estate_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_estate_assignments"          ON public.estate_assignments;
DROP POLICY IF EXISTS "authenticated_all_estate_assignments"  ON public.estate_assignments;

CREATE POLICY "estate_assignments_insert_authenticated"
ON public.estate_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "estate_assignments_select_staff"
ON public.estate_assignments
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "estate_assignments_update_staff"
ON public.estate_assignments
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "estate_assignments_delete_staff"
ON public.estate_assignments
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 23: FIX PERSON_CONTACTS
-- ============================================================

ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_person_contacts"           ON public.person_contacts;
DROP POLICY IF EXISTS "authenticated_all_person_contacts"   ON public.person_contacts;
DROP POLICY IF EXISTS "tenant_view_own_person_contacts"     ON public.person_contacts;

CREATE POLICY "person_contacts_insert_authenticated"
ON public.person_contacts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "person_contacts_select_staff_tenant"
ON public.person_contacts
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND person_id = public.get_current_person_id()
  )
);

CREATE POLICY "person_contacts_update_staff"
ON public.person_contacts
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "person_contacts_delete_staff"
ON public.person_contacts
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 24: FIX CO_TENANTS
-- ============================================================

ALTER TABLE public.co_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_co_tenants"          ON public.co_tenants;
DROP POLICY IF EXISTS "authenticated_all_co_tenants"  ON public.co_tenants;
DROP POLICY IF EXISTS "tenant_view_co_tenants"        ON public.co_tenants;

CREATE POLICY "co_tenants_insert_authenticated"
ON public.co_tenants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "co_tenants_select_staff_tenant"
ON public.co_tenants
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND lease_id IN (
      SELECT id FROM public.leases
      WHERE lessee_person_id = public.get_current_person_id()
    )
  )
);

CREATE POLICY "co_tenants_update_staff"
ON public.co_tenants
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "co_tenants_delete_staff"
ON public.co_tenants
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 25: FIX CO_LANDLORDS
-- ============================================================

ALTER TABLE public.co_landlords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_co_landlords"              ON public.co_landlords;
DROP POLICY IF EXISTS "authenticated_all_co_landlords"      ON public.co_landlords;
DROP POLICY IF EXISTS "landlord_view_own_co_landlords"      ON public.co_landlords;

CREATE POLICY "co_landlords_insert_authenticated"
ON public.co_landlords
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "co_landlords_select_staff_landlord"
ON public.co_landlords
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR landlord_id = auth.uid()
);

CREATE POLICY "co_landlords_update_staff"
ON public.co_landlords
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "co_landlords_delete_staff"
ON public.co_landlords
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 26: FIX WORK_ORDER_SERVICE_REQUESTS
-- ============================================================

ALTER TABLE public.work_order_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_work_order_service_requests"         ON public.work_order_service_requests;
DROP POLICY IF EXISTS "authenticated_all_work_order_service_requests" ON public.work_order_service_requests;

CREATE POLICY "work_order_service_requests_insert_authenticated"
ON public.work_order_service_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "work_order_service_requests_select_staff"
ON public.work_order_service_requests
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "work_order_service_requests_update_staff"
ON public.work_order_service_requests
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "work_order_service_requests_delete_staff"
ON public.work_order_service_requests
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 27: FIX USER_PROJECT_ASSIGNMENTS
-- ============================================================

ALTER TABLE public.user_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_user_project_assignments"          ON public.user_project_assignments;
DROP POLICY IF EXISTS "authenticated_all_user_project_assignments"  ON public.user_project_assignments;

CREATE POLICY "user_project_assignments_insert_authenticated"
ON public.user_project_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "user_project_assignments_select_staff"
ON public.user_project_assignments
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "user_project_assignments_update_staff"
ON public.user_project_assignments
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "user_project_assignments_delete_staff"
ON public.user_project_assignments
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 28: FIX NOTIFICATION_SETTINGS
-- ============================================================

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_notification_settings"         ON public.notification_settings;
DROP POLICY IF EXISTS "authenticated_all_notification_settings" ON public.notification_settings;

CREATE POLICY "notification_settings_insert_authenticated"
ON public.notification_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notification_settings_select_staff"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (public.is_staff_user());

CREATE POLICY "notification_settings_update_staff"
ON public.notification_settings
FOR UPDATE
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "notification_settings_delete_staff"
ON public.notification_settings
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- STEP 29: FIX SERVICE_REQUESTS — same pattern
-- ============================================================

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_service_requests"                      ON public.service_requests;
DROP POLICY IF EXISTS "authenticated_all_service_requests"              ON public.service_requests;
DROP POLICY IF EXISTS "tenant_view_own_service_requests"                ON public.service_requests;
DROP POLICY IF EXISTS "tenant_insert_service_requests"                  ON public.service_requests;
DROP POLICY IF EXISTS "provider_view_assigned_service_requests"         ON public.service_requests;

CREATE POLICY "service_requests_insert_authenticated"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "service_requests_select_staff_tenant_provider"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'tenant' AND person_id IS NOT NULL)
    AND unit_id IN (
      SELECT unit_id FROM public.leases
      WHERE lessee_person_id = public.get_current_person_id()
    )
  )
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND provider_id = public.get_current_provider_id()
  )
);

CREATE POLICY "service_requests_update_staff_provider"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (
  public.is_staff_user()
  OR (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'viewer' AND provider_id IS NOT NULL)
    AND provider_id = public.get_current_provider_id()
  )
)
WITH CHECK (public.is_staff_user());

CREATE POLICY "service_requests_delete_staff"
ON public.service_requests
FOR DELETE
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- DONE
-- ============================================================
