-- ============================================================
-- Granular RLS Policies Migration
-- Locks down all tables with role-based access:
--   Staff (admin/manager/operations/landlord/portal_owner) → full access
--   Tenant (role=tenant, person_id set) → own data only
--   Provider (role=viewer, provider_id set) → own work orders/invoices only
--   Viewer (role=viewer, no provider_id) → read-only on non-sensitive tables
-- ============================================================

-- ============================================================
-- 1. REFRESH CORE HELPER FUNCTIONS
-- ============================================================

-- is_staff_user: admin, manager, operations, landlord, portal_owner
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

-- is_admin_user: only admin and portal_owner can manage users/settings
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'portal_owner')
  );
$$;

-- get_current_person_id: for tenant portal
CREATE OR REPLACE FUNCTION public.get_current_person_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT person_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- get_current_provider_id: for service provider portal
CREATE OR REPLACE FUNCTION public.get_current_provider_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT provider_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- is_tenant_user: role=tenant with a linked person
CREATE OR REPLACE FUNCTION public.is_tenant_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'tenant'
    AND person_id IS NOT NULL
  );
$$;

-- is_provider_user: role=viewer with a linked provider
CREATE OR REPLACE FUNCTION public.is_provider_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'viewer'
    AND provider_id IS NOT NULL
  );
$$;

-- ============================================================
-- 2. USER_PROFILES — own row + admin full access
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "staff_view_user_profiles" ON public.user_profiles;

-- Every authenticated user can read and update their own profile
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin/portal_owner can manage all profiles (user management screens)
CREATE POLICY "admin_all_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- All staff can read all profiles (needed for assignment dropdowns etc.)
CREATE POLICY "staff_view_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- 3. PROJECTS — staff full, tenant/provider read-only
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_projects" ON public.projects;
DROP POLICY IF EXISTS "staff_all_projects" ON public.projects;
DROP POLICY IF EXISTS "tenant_view_projects" ON public.projects;
DROP POLICY IF EXISTS "provider_view_projects" ON public.projects;

CREATE POLICY "staff_all_projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Tenants can read projects for their leased units
CREATE POLICY "tenant_view_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND id IN (
    SELECT p.project_id FROM public.properties p
    JOIN public.units u ON u.property_id = p.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE l.lessee_person_id = public.get_current_person_id()
  )
);

-- Providers can read projects they are assigned to
CREATE POLICY "provider_view_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND id IN (
    SELECT project_id FROM public.provider_project_assignments
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 4. PROPERTIES — staff full, tenant/provider read-only
-- ============================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_properties" ON public.properties;
DROP POLICY IF EXISTS "staff_all_properties" ON public.properties;
DROP POLICY IF EXISTS "tenant_view_properties" ON public.properties;
DROP POLICY IF EXISTS "provider_view_properties" ON public.properties;

CREATE POLICY "staff_all_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND id IN (
    SELECT u.property_id FROM public.units u
    JOIN public.leases l ON l.unit_id = u.id
    WHERE l.lessee_person_id = public.get_current_person_id()
  )
);

CREATE POLICY "provider_view_properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND project_id IN (
    SELECT project_id FROM public.provider_project_assignments
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 5. BUILDINGS — staff full, tenant/provider read-only
-- ============================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_buildings" ON public.buildings;
DROP POLICY IF EXISTS "staff_all_buildings" ON public.buildings;
DROP POLICY IF EXISTS "tenant_view_buildings" ON public.buildings;
DROP POLICY IF EXISTS "provider_view_buildings" ON public.buildings;

CREATE POLICY "staff_all_buildings"
ON public.buildings
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_buildings"
ON public.buildings
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND project_id IN (
    SELECT p.project_id FROM public.properties p
    JOIN public.units u ON u.property_id = p.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE l.lessee_person_id = public.get_current_person_id()
  )
);

CREATE POLICY "provider_view_buildings"
ON public.buildings
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND project_id IN (
    SELECT project_id FROM public.provider_project_assignments
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 6. FLOORS — staff full, tenant/provider read-only
-- ============================================================

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_floors" ON public.floors;
DROP POLICY IF EXISTS "staff_all_floors" ON public.floors;
DROP POLICY IF EXISTS "tenant_view_floors" ON public.floors;
DROP POLICY IF EXISTS "provider_view_floors" ON public.floors;

CREATE POLICY "staff_all_floors"
ON public.floors
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_floors"
ON public.floors
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND building_id IN (
    SELECT b.id FROM public.buildings b
    JOIN public.properties p ON p.project_id = b.project_id
    JOIN public.units u ON u.property_id = p.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE l.lessee_person_id = public.get_current_person_id()
  )
);

CREATE POLICY "provider_view_floors"
ON public.floors
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND building_id IN (
    SELECT b.id FROM public.buildings b
    JOIN public.provider_project_assignments ppa ON ppa.project_id = b.project_id
    WHERE ppa.provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 7. UNITS — staff full, tenant sees own leased units, provider sees assigned project units
-- ============================================================

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_units" ON public.units;
DROP POLICY IF EXISTS "staff_all_units" ON public.units;
DROP POLICY IF EXISTS "tenant_view_leased_units" ON public.units;
DROP POLICY IF EXISTS "provider_view_units" ON public.units;

CREATE POLICY "staff_all_units"
ON public.units
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_leased_units"
ON public.units
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND id IN (
    SELECT unit_id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

CREATE POLICY "provider_view_units"
ON public.units
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.provider_project_assignments ppa ON ppa.project_id = p.project_id
    WHERE ppa.provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 8. PERSONS — staff full, tenant sees own record, provider no access
-- ============================================================

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_persons" ON public.persons;
DROP POLICY IF EXISTS "staff_all_persons" ON public.persons;
DROP POLICY IF EXISTS "tenant_view_own_person" ON public.persons;

CREATE POLICY "staff_all_persons"
ON public.persons
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_person"
ON public.persons
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND id = public.get_current_person_id()
);

-- ============================================================
-- 9. PERSON_CONTACTS — staff full, tenant sees contacts for own person
-- ============================================================

ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_person_contacts" ON public.person_contacts;
DROP POLICY IF EXISTS "staff_all_person_contacts" ON public.person_contacts;
DROP POLICY IF EXISTS "tenant_view_own_person_contacts" ON public.person_contacts;

CREATE POLICY "staff_all_person_contacts"
ON public.person_contacts
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_person_contacts"
ON public.person_contacts
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND person_id = public.get_current_person_id()
);

-- ============================================================
-- 10. LEASES — staff full, tenant sees own leases
-- ============================================================

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_leases" ON public.leases;
DROP POLICY IF EXISTS "staff_all_leases" ON public.leases;
DROP POLICY IF EXISTS "tenant_view_own_leases" ON public.leases;

CREATE POLICY "staff_all_leases"
ON public.leases
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_leases"
ON public.leases
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND lessee_person_id IS NOT NULL
  AND lessee_person_id = public.get_current_person_id()
);

-- ============================================================
-- 11. CO_TENANTS — staff full, tenant sees co-tenants on own leases
-- ============================================================

ALTER TABLE public.co_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_co_tenants" ON public.co_tenants;
DROP POLICY IF EXISTS "staff_all_co_tenants" ON public.co_tenants;
DROP POLICY IF EXISTS "tenant_view_co_tenants" ON public.co_tenants;

CREATE POLICY "staff_all_co_tenants"
ON public.co_tenants
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_co_tenants"
ON public.co_tenants
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND lease_id IN (
    SELECT id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

-- ============================================================
-- 12. CO_LANDLORDS — staff full, landlord sees own co-landlord entries
-- ============================================================

ALTER TABLE public.co_landlords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_co_landlords" ON public.co_landlords;
DROP POLICY IF EXISTS "staff_all_co_landlords" ON public.co_landlords;
DROP POLICY IF EXISTS "landlord_view_own_co_landlords" ON public.co_landlords;

CREATE POLICY "staff_all_co_landlords"
ON public.co_landlords
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "landlord_view_own_co_landlords"
ON public.co_landlords
FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

-- ============================================================
-- 13. TENANTS — staff full, tenant sees own record
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "staff_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenant_view_own_tenant_record" ON public.tenants;

CREATE POLICY "staff_all_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_tenant_record"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND user_id = auth.uid()
);

-- ============================================================
-- 14. INVOICES — staff full, tenant sees own, provider sees work-order invoices
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_invoices" ON public.invoices;
DROP POLICY IF EXISTS "staff_all_invoices" ON public.invoices;
DROP POLICY IF EXISTS "tenant_view_own_invoices" ON public.invoices;
DROP POLICY IF EXISTS "provider_view_own_invoices" ON public.invoices;

CREATE POLICY "staff_all_invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND lease_id IN (
    SELECT id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

CREATE POLICY "provider_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND work_order_id IN (
    SELECT id FROM public.work_orders
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 15. PAYMENTS — staff full, tenant sees payments on own invoices
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_payments" ON public.payments;
DROP POLICY IF EXISTS "staff_all_payments" ON public.payments;
DROP POLICY IF EXISTS "tenant_view_own_payments" ON public.payments;

CREATE POLICY "staff_all_payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND invoice_id IN (
    SELECT i.id FROM public.invoices i
    JOIN public.leases l ON l.id = i.lease_id
    WHERE l.lessee_person_id = public.get_current_person_id()
  )
);

-- ============================================================
-- 16. SERVICE_REQUESTS — staff full, tenant sees own unit requests, provider sees assigned
-- ============================================================

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "staff_all_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "tenant_view_own_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "tenant_insert_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "provider_view_assigned_service_requests" ON public.service_requests;

CREATE POLICY "staff_all_service_requests"
ON public.service_requests
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Tenants can view service requests for their leased units
CREATE POLICY "tenant_view_own_service_requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND unit_id IN (
    SELECT unit_id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

-- Tenants can raise new service requests for their units
CREATE POLICY "tenant_insert_service_requests"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tenant_user()
  AND unit_id IN (
    SELECT unit_id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

-- Providers can view service requests linked to their work orders
CREATE POLICY "provider_view_assigned_service_requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND id IN (
    SELECT wosr.service_request_id
    FROM public.work_order_service_requests wosr
    JOIN public.work_orders wo ON wo.id = wosr.work_order_id
    WHERE wo.provider_id = public.get_current_provider_id()
    AND wosr.service_request_id IS NOT NULL
  )
);

-- ============================================================
-- 17. MAINTENANCE_REQUESTS — staff full, provider sees assigned
-- ============================================================

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_maintenance_requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "staff_all_maintenance_requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "provider_view_assigned_maintenance_requests" ON public.maintenance_requests;

CREATE POLICY "staff_all_maintenance_requests"
ON public.maintenance_requests
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Providers can view maintenance requests linked to their work orders
CREATE POLICY "provider_view_assigned_maintenance_requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND id IN (
    SELECT wosr.maintenance_request_id
    FROM public.work_order_service_requests wosr
    JOIN public.work_orders wo ON wo.id = wosr.work_order_id
    WHERE wo.provider_id = public.get_current_provider_id()
    AND wosr.maintenance_request_id IS NOT NULL
  )
);

-- ============================================================
-- 18. WORK_ORDERS — staff full, provider sees/updates own
-- ============================================================

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "staff_all_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "provider_view_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "provider_update_own_work_orders" ON public.work_orders;

CREATE POLICY "staff_all_work_orders"
ON public.work_orders
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "provider_view_own_work_orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND provider_id IS NOT NULL
  AND provider_id = public.get_current_provider_id()
);

-- Providers can update status and charge fields on their own work orders
CREATE POLICY "provider_update_own_work_orders"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (
  public.is_provider_user()
  AND provider_id IS NOT NULL
  AND provider_id = public.get_current_provider_id()
)
WITH CHECK (
  public.is_provider_user()
  AND provider_id IS NOT NULL
  AND provider_id = public.get_current_provider_id()
);

-- ============================================================
-- 19. WORK_ORDER_SERVICE_REQUESTS — staff full, provider sees own
-- ============================================================

ALTER TABLE public.work_order_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_work_order_service_requests" ON public.work_order_service_requests;
DROP POLICY IF EXISTS "authenticated_all_wo_sr" ON public.work_order_service_requests;
DROP POLICY IF EXISTS "staff_all_work_order_service_requests" ON public.work_order_service_requests;
DROP POLICY IF EXISTS "provider_view_own_work_order_service_requests" ON public.work_order_service_requests;

CREATE POLICY "staff_all_work_order_service_requests"
ON public.work_order_service_requests
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "provider_view_own_work_order_service_requests"
ON public.work_order_service_requests
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND work_order_id IN (
    SELECT id FROM public.work_orders
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 20. SERVICE_PROVIDERS — staff full, provider sees own record
-- ============================================================

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_service_providers" ON public.service_providers;
DROP POLICY IF EXISTS "staff_all_service_providers" ON public.service_providers;
DROP POLICY IF EXISTS "provider_view_own_record" ON public.service_providers;

CREATE POLICY "staff_all_service_providers"
ON public.service_providers
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "provider_view_own_record"
ON public.service_providers
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND id = public.get_current_provider_id()
);

-- ============================================================
-- 21. PROVIDER_PROJECT_ASSIGNMENTS — staff full, provider sees own
-- ============================================================

ALTER TABLE public.provider_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_provider_assignments" ON public.provider_project_assignments;
DROP POLICY IF EXISTS "staff_all_provider_project_assignments" ON public.provider_project_assignments;
DROP POLICY IF EXISTS "provider_view_own_assignments" ON public.provider_project_assignments;

CREATE POLICY "staff_all_provider_project_assignments"
ON public.provider_project_assignments
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "provider_view_own_assignments"
ON public.provider_project_assignments
FOR SELECT
TO authenticated
USING (
  public.is_provider_user()
  AND provider_id = public.get_current_provider_id()
);

-- ============================================================
-- 22. ESTATE_ASSIGNMENTS — staff full, tenant sees own unit assignments
-- ============================================================

ALTER TABLE public.estate_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_estate_assignments" ON public.estate_assignments;
DROP POLICY IF EXISTS "staff_all_estate_assignments" ON public.estate_assignments;
DROP POLICY IF EXISTS "tenant_view_own_estate_assignments" ON public.estate_assignments;

CREATE POLICY "staff_all_estate_assignments"
ON public.estate_assignments
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_estate_assignments"
ON public.estate_assignments
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND person_id = public.get_current_person_id()
);

-- ============================================================
-- 23. TURNOVER_RENT — staff full, tenant sees own lease turnover data
-- ============================================================

ALTER TABLE public.turnover_rent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_turnover_rent" ON public.turnover_rent;
DROP POLICY IF EXISTS "staff_all_turnover_rent" ON public.turnover_rent;
DROP POLICY IF EXISTS "tenant_view_own_turnover_rent" ON public.turnover_rent;

CREATE POLICY "staff_all_turnover_rent"
ON public.turnover_rent
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_own_turnover_rent"
ON public.turnover_rent
FOR SELECT
TO authenticated
USING (
  public.is_tenant_user()
  AND lease_id IN (
    SELECT id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

-- ============================================================
-- 24. VAT_CONFIG — staff full, no tenant/provider access
-- ============================================================

ALTER TABLE public.vat_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_vat_config" ON public.vat_config;
DROP POLICY IF EXISTS "staff_all_vat_config" ON public.vat_config;

CREATE POLICY "staff_all_vat_config"
ON public.vat_config
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- ============================================================
-- 25. USER_PROJECT_ASSIGNMENTS — staff full, operations/manager see own
-- ============================================================

ALTER TABLE public.user_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_user_project_assignments" ON public.user_project_assignments;
DROP POLICY IF EXISTS "staff_all_user_project_assignments" ON public.user_project_assignments;
DROP POLICY IF EXISTS "user_view_own_project_assignments" ON public.user_project_assignments;

CREATE POLICY "staff_all_user_project_assignments"
ON public.user_project_assignments
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Non-admin staff can see their own project assignments
CREATE POLICY "user_view_own_project_assignments"
ON public.user_project_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 26. BULK_UPLOAD_LOGS — admin full, other staff read-only
-- ============================================================

ALTER TABLE public.bulk_upload_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_bulk_upload_logs" ON public.bulk_upload_logs;
DROP POLICY IF EXISTS "admin_all_bulk_upload_logs" ON public.bulk_upload_logs;
DROP POLICY IF EXISTS "staff_view_bulk_upload_logs" ON public.bulk_upload_logs;

CREATE POLICY "admin_all_bulk_upload_logs"
ON public.bulk_upload_logs
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "staff_view_bulk_upload_logs"
ON public.bulk_upload_logs
FOR SELECT
TO authenticated
USING (public.is_staff_user());

-- ============================================================
-- 27. NOTIFICATION_SETTINGS — each user manages own settings
-- ============================================================

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "users_manage_own_notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "admin_all_notification_settings" ON public.notification_settings;

CREATE POLICY "users_manage_own_notification_settings"
ON public.notification_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_all_notification_settings"
ON public.notification_settings
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- ============================================================
-- 28. AUDIT_LOGS — admin/manager full, operations read-only, no tenant/provider access
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "staff_all_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "admin_all_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "staff_view_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "staff_insert_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;

-- Admin and manager can read all audit logs
CREATE POLICY "admin_all_audit_logs"
ON public.audit_logs
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- All staff can read audit logs (for transparency)
CREATE POLICY "staff_view_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_staff_user());

-- All authenticated users can insert audit log entries (fire-and-forget logging)
CREATE POLICY "authenticated_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
