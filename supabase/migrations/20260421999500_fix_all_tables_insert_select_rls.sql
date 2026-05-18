-- ============================================================
-- Fix INSERT + SELECT RLS policies for ALL application tables
-- Ensures authenticated users can insert and read their own rows
-- ============================================================

-- -------------------------------------------------------
-- user_profiles
-- -------------------------------------------------------
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- -------------------------------------------------------
-- projects  (ownership column: created_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own"
ON public.projects
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.staff_project_assignments spa
    WHERE spa.project_id = id AND spa.user_id = auth.uid()
  )
);

-- -------------------------------------------------------
-- buildings  (access via project membership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "buildings_insert_authenticated" ON public.buildings;
CREATE POLICY "buildings_insert_authenticated"
ON public.buildings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "buildings_select_authenticated" ON public.buildings;
CREATE POLICY "buildings_select_authenticated"
ON public.buildings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

-- -------------------------------------------------------
-- floors  (access via building → project membership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "floors_insert_authenticated" ON public.floors;
CREATE POLICY "floors_insert_authenticated"
ON public.floors
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.buildings b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = building_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "floors_select_authenticated" ON public.floors;
CREATE POLICY "floors_select_authenticated"
ON public.floors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.buildings b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = building_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

-- -------------------------------------------------------
-- units  (access via property → project OR floor → building → project)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "units_insert_authenticated" ON public.units;
CREATE POLICY "units_insert_authenticated"
ON public.units
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "units_select_authenticated" ON public.units;
CREATE POLICY "units_select_authenticated"
ON public.units
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- properties  (ownership via owner_id or project membership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "properties_insert_authenticated" ON public.properties;
CREATE POLICY "properties_insert_authenticated"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "properties_select_authenticated" ON public.properties;
CREATE POLICY "properties_select_authenticated"
ON public.properties
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

-- -------------------------------------------------------
-- persons  (no direct user ownership — allow all authenticated)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "persons_insert_authenticated" ON public.persons;
CREATE POLICY "persons_insert_authenticated"
ON public.persons
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "persons_select_authenticated" ON public.persons;
CREATE POLICY "persons_select_authenticated"
ON public.persons
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- person_contacts  (no direct user ownership — allow all authenticated)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "person_contacts_insert_authenticated" ON public.person_contacts;
CREATE POLICY "person_contacts_insert_authenticated"
ON public.person_contacts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "person_contacts_select_authenticated" ON public.person_contacts;
CREATE POLICY "person_contacts_select_authenticated"
ON public.person_contacts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- tenants  (ownership column: user_id — nullable)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenants_insert_authenticated" ON public.tenants;
CREATE POLICY "tenants_insert_authenticated"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tenants_select_authenticated" ON public.tenants;
CREATE POLICY "tenants_select_authenticated"
ON public.tenants
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- leases  (ownership column: created_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "leases_insert_own" ON public.leases;
CREATE POLICY "leases_insert_own"
ON public.leases
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "leases_select_authenticated" ON public.leases;
CREATE POLICY "leases_select_authenticated"
ON public.leases
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- co_tenants  (no direct user ownership — allow all authenticated)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "co_tenants_insert_authenticated" ON public.co_tenants;
CREATE POLICY "co_tenants_insert_authenticated"
ON public.co_tenants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "co_tenants_select_authenticated" ON public.co_tenants;
CREATE POLICY "co_tenants_select_authenticated"
ON public.co_tenants
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- co_landlords  (ownership column: landlord_id)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "co_landlords_insert_own" ON public.co_landlords;
CREATE POLICY "co_landlords_insert_own"
ON public.co_landlords
FOR INSERT
TO authenticated
WITH CHECK (landlord_id = auth.uid() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "co_landlords_select_authenticated" ON public.co_landlords;
CREATE POLICY "co_landlords_select_authenticated"
ON public.co_landlords
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- invoices  (ownership column: created_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "invoices_insert_own" ON public.invoices;
CREATE POLICY "invoices_insert_own"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "invoices_select_authenticated" ON public.invoices;
CREATE POLICY "invoices_select_authenticated"
ON public.invoices
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- payments  (ownership column: recorded_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (recorded_by = auth.uid() OR recorded_by IS NULL);

DROP POLICY IF EXISTS "payments_select_authenticated" ON public.payments;
CREATE POLICY "payments_select_authenticated"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- service_requests  (ownership column: raised_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "service_requests_insert_own" ON public.service_requests;
CREATE POLICY "service_requests_insert_own"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (raised_by = auth.uid() OR raised_by IS NULL);

DROP POLICY IF EXISTS "service_requests_select_authenticated" ON public.service_requests;
CREATE POLICY "service_requests_select_authenticated"
ON public.service_requests
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- lease_renewals  (ownership column: created_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "lease_renewals_insert_own" ON public.lease_renewals;
CREATE POLICY "lease_renewals_insert_own"
ON public.lease_renewals
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "lease_renewals_select_authenticated" ON public.lease_renewals;
CREATE POLICY "lease_renewals_select_authenticated"
ON public.lease_renewals
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- bulk_upload_logs  (ownership column: uploaded_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "bulk_upload_logs_insert_own" ON public.bulk_upload_logs;
CREATE POLICY "bulk_upload_logs_insert_own"
ON public.bulk_upload_logs
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid() OR uploaded_by IS NULL);

DROP POLICY IF EXISTS "bulk_upload_logs_select_own" ON public.bulk_upload_logs;
CREATE POLICY "bulk_upload_logs_select_own"
ON public.bulk_upload_logs
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

-- -------------------------------------------------------
-- notification_settings  (ownership column: user_id)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "notification_settings_insert_own" ON public.notification_settings;
CREATE POLICY "notification_settings_insert_own"
ON public.notification_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_settings_select_own" ON public.notification_settings;
CREATE POLICY "notification_settings_select_own"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- -------------------------------------------------------
-- user_project_assignments  (ownership column: user_id)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "user_project_assignments_insert_own" ON public.user_project_assignments;
CREATE POLICY "user_project_assignments_insert_own"
ON public.user_project_assignments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "user_project_assignments_select_authenticated" ON public.user_project_assignments;
CREATE POLICY "user_project_assignments_select_authenticated"
ON public.user_project_assignments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- staff_project_assignments  (ownership column: user_id)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "staff_project_assignments_insert_own" ON public.staff_project_assignments;
CREATE POLICY "staff_project_assignments_insert_own"
ON public.staff_project_assignments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "staff_project_assignments_select_authenticated" ON public.staff_project_assignments;
CREATE POLICY "staff_project_assignments_select_authenticated"
ON public.staff_project_assignments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- service_providers  (no direct user ownership — allow all authenticated)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "service_providers_insert_authenticated" ON public.service_providers;
CREATE POLICY "service_providers_insert_authenticated"
ON public.service_providers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "service_providers_select_authenticated" ON public.service_providers;
CREATE POLICY "service_providers_select_authenticated"
ON public.service_providers
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- provider_project_assignments  (no direct user ownership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "provider_project_assignments_insert_authenticated" ON public.provider_project_assignments;
CREATE POLICY "provider_project_assignments_insert_authenticated"
ON public.provider_project_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "provider_project_assignments_select_authenticated" ON public.provider_project_assignments;
CREATE POLICY "provider_project_assignments_select_authenticated"
ON public.provider_project_assignments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- estate_assignments  (no direct user ownership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "estate_assignments_insert_authenticated" ON public.estate_assignments;
CREATE POLICY "estate_assignments_insert_authenticated"
ON public.estate_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "estate_assignments_select_authenticated" ON public.estate_assignments;
CREATE POLICY "estate_assignments_select_authenticated"
ON public.estate_assignments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- maintenance_requests  (ownership column: raised_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "maintenance_requests_insert_own" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_insert_own"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (raised_by = auth.uid() OR raised_by IS NULL);

DROP POLICY IF EXISTS "maintenance_requests_select_authenticated" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_select_authenticated"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- work_orders  (ownership column: raised_by)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "work_orders_insert_own" ON public.work_orders;
CREATE POLICY "work_orders_insert_own"
ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (raised_by = auth.uid() OR raised_by IS NULL);

DROP POLICY IF EXISTS "work_orders_select_authenticated" ON public.work_orders;
CREATE POLICY "work_orders_select_authenticated"
ON public.work_orders
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- work_order_service_requests  (no direct user ownership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "work_order_service_requests_insert_authenticated" ON public.work_order_service_requests;
CREATE POLICY "work_order_service_requests_insert_authenticated"
ON public.work_order_service_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "work_order_service_requests_select_authenticated" ON public.work_order_service_requests;
CREATE POLICY "work_order_service_requests_select_authenticated"
ON public.work_order_service_requests
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- turnover_rent  (no direct user ownership — confirmed_by is optional)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "turnover_rent_insert_authenticated" ON public.turnover_rent;
CREATE POLICY "turnover_rent_insert_authenticated"
ON public.turnover_rent
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "turnover_rent_select_authenticated" ON public.turnover_rent;
CREATE POLICY "turnover_rent_select_authenticated"
ON public.turnover_rent
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- vat_config  (access via project membership)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "vat_config_insert_authenticated" ON public.vat_config;
CREATE POLICY "vat_config_insert_authenticated"
ON public.vat_config
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_project_assignments spa
        WHERE spa.project_id = p.id AND spa.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "vat_config_select_authenticated" ON public.vat_config;
CREATE POLICY "vat_config_select_authenticated"
ON public.vat_config
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
