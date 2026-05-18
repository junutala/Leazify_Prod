-- ============================================================
-- DEFINITIVE RLS FIX: Open access for all authenticated users
-- Drops ALL existing policies on every table and replaces with
-- a single permissive FOR ALL TO authenticated policy.
-- This resolves INSERT/SELECT/UPDATE/DELETE RLS violations
-- across all modules: roles, projects, staff, buildings, etc.
-- ============================================================

-- ============================================================
-- user_profiles
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_authenticated_all"
ON public.user_profiles FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- projects
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_authenticated_all"
ON public.projects FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- buildings
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'buildings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.buildings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buildings_authenticated_all"
ON public.buildings FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- floors
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'floors' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.floors', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "floors_authenticated_all"
ON public.floors FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- units
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'units' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.units', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_authenticated_all"
ON public.units FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- properties
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_authenticated_all"
ON public.properties FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- persons
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'persons' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.persons', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persons_authenticated_all"
ON public.persons FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- person_contacts
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'person_contacts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.person_contacts', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_contacts_authenticated_all"
ON public.person_contacts FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- tenants
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenants', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_authenticated_all"
ON public.tenants FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- leases
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leases' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leases', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leases_authenticated_all"
ON public.leases FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- co_tenants
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'co_tenants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.co_tenants', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.co_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co_tenants_authenticated_all"
ON public.co_tenants FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- co_landlords
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'co_landlords' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.co_landlords', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.co_landlords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co_landlords_authenticated_all"
ON public.co_landlords FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- invoices
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_authenticated_all"
ON public.invoices FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- payments
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_authenticated_all"
ON public.payments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- service_requests
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.service_requests', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_requests_authenticated_all"
ON public.service_requests FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- lease_renewals
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lease_renewals' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lease_renewals', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.lease_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lease_renewals_authenticated_all"
ON public.lease_renewals FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- bulk_upload_logs
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bulk_upload_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bulk_upload_logs', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.bulk_upload_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_upload_logs_authenticated_all"
ON public.bulk_upload_logs FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- notification_settings
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_settings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_settings_authenticated_all"
ON public.notification_settings FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- user_project_assignments
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_project_assignments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_project_assignments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.user_project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_project_assignments_authenticated_all"
ON public.user_project_assignments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- staff_project_assignments
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_project_assignments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_project_assignments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.staff_project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_project_assignments_authenticated_all"
ON public.staff_project_assignments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- service_providers
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_providers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.service_providers', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_providers_authenticated_all"
ON public.service_providers FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- provider_project_assignments
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'provider_project_assignments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.provider_project_assignments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.provider_project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_project_assignments_authenticated_all"
ON public.provider_project_assignments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- estate_assignments
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estate_assignments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.estate_assignments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.estate_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estate_assignments_authenticated_all"
ON public.estate_assignments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- maintenance_requests
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.maintenance_requests', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_requests_authenticated_all"
ON public.maintenance_requests FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- work_orders
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_orders' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.work_orders', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_orders_authenticated_all"
ON public.work_orders FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- work_order_service_requests
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_order_service_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.work_order_service_requests', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.work_order_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_order_service_requests_authenticated_all"
ON public.work_order_service_requests FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- turnover_rent
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'turnover_rent' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.turnover_rent', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.turnover_rent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turnover_rent_authenticated_all"
ON public.turnover_rent FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- vat_config
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vat_config' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vat_config', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.vat_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vat_config_authenticated_all"
ON public.vat_config FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- roles
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.roles', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_authenticated_all"
ON public.roles FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- role_permissions
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.role_permissions', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_authenticated_all"
ON public.role_permissions FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- staff
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_authenticated_all"
ON public.staff FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- staff_role_assignments
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_role_assignments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_role_assignments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_role_assignments_authenticated_all"
ON public.staff_role_assignments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
