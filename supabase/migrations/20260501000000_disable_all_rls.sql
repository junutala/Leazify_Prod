-- ============================================================
-- DISABLE RLS ON ALL PUBLIC TABLES
-- Access control is handled entirely in application code:
--   - Responsibilities (roles/role_permissions) → sidebar visibility
--   - staff_project_assignments → data scope per user
-- ============================================================

-- Core property tables
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;

-- Leasing & financial
ALTER TABLE public.leases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnover_rent DISABLE ROW LEVEL SECURITY;

-- Maintenance & work orders
ALTER TABLE public.service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders DISABLE ROW LEVEL SECURITY;

-- People & tenants
ALTER TABLE public.persons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_landlords DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_landlord_assignments DISABLE ROW LEVEL SECURITY;

-- Staff & permissions
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_project_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- User profiles & project assignments
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_project_assignments DISABLE ROW LEVEL SECURITY;

-- Service providers
ALTER TABLE public.service_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_project_assignments DISABLE ROW LEVEL SECURITY;

-- Audit & misc
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_renewals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_assignments DISABLE ROW LEVEL SECURITY;

-- Quote submissions (tenant portal)
ALTER TABLE public.quote_submissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on staff_project_assignments to remove the
-- "user can only see own assignments" restriction that was blocking admin queries
DROP POLICY IF EXISTS "staff_assignments_manage_own" ON public.staff_project_assignments;
DROP POLICY IF EXISTS "staff_project_assignments_all" ON public.staff_project_assignments;
DROP POLICY IF EXISTS "authenticated_all_staff_project_assignments" ON public.staff_project_assignments;

-- Drop all restrictive project policies that blocked staff from seeing data
DROP POLICY IF EXISTS "projects_select_assigned" ON public.projects;
DROP POLICY IF EXISTS "projects_update_assigned" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_assigned" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON public.projects;
DROP POLICY IF EXISTS "staff_all_projects" ON public.projects;
DROP POLICY IF EXISTS "authenticated_all_projects" ON public.projects;

-- Drop restrictive policies on leases
DROP POLICY IF EXISTS "leases_select_staff" ON public.leases;
DROP POLICY IF EXISTS "leases_all_authenticated" ON public.leases;
DROP POLICY IF EXISTS "authenticated_all_leases" ON public.leases;

-- Drop restrictive policies on invoices
DROP POLICY IF EXISTS "invoices_select_staff" ON public.invoices;
DROP POLICY IF EXISTS "invoices_all_authenticated" ON public.invoices;
DROP POLICY IF EXISTS "authenticated_all_invoices" ON public.invoices;

-- Drop restrictive policies on service_requests
DROP POLICY IF EXISTS "service_requests_select_staff" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_all_authenticated" ON public.service_requests;
DROP POLICY IF EXISTS "authenticated_all_service_requests" ON public.service_requests;

-- Drop restrictive policies on maintenance_requests
DROP POLICY IF EXISTS "maintenance_requests_select_staff" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_all_authenticated" ON public.maintenance_requests;
DROP POLICY IF EXISTS "authenticated_all_maintenance_requests" ON public.maintenance_requests;

-- Drop restrictive policies on work_orders
DROP POLICY IF EXISTS "work_orders_select_staff" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_all_authenticated" ON public.work_orders;
DROP POLICY IF EXISTS "authenticated_all_work_orders" ON public.work_orders;

-- Drop restrictive policies on units/buildings/floors
DROP POLICY IF EXISTS "units_select_staff" ON public.units;
DROP POLICY IF EXISTS "buildings_select_staff" ON public.buildings;
DROP POLICY IF EXISTS "floors_select_staff" ON public.floors;
DROP POLICY IF EXISTS "authenticated_all_units" ON public.units;
DROP POLICY IF EXISTS "authenticated_all_buildings" ON public.buildings;
DROP POLICY IF EXISTS "authenticated_all_floors" ON public.floors;

-- ============================================================
-- Fix is_staff_user() and is_admin_user() — used by any
-- remaining triggers/functions. Keep them simple and safe.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

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
