-- ============================================================
-- PropFlow Base Schema Migration
-- Creates all foundational tables required by subsequent migrations
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'operations', 'landlord', 'portal_owner', 'tenant', 'viewer');

DROP TYPE IF EXISTS public.property_type CASCADE;
CREATE TYPE public.property_type AS ENUM ('residential', 'office', 'retail', 'industrial', 'mixed_use');

DROP TYPE IF EXISTS public.unit_status CASCADE;
CREATE TYPE public.unit_status AS ENUM ('vacant', 'occupied', 'maintenance', 'reserved');

DROP TYPE IF EXISTS public.lease_status CASCADE;
CREATE TYPE public.lease_status AS ENUM ('draft', 'active', 'expired', 'terminated', 'renewed');

DROP TYPE IF EXISTS public.invoice_type CASCADE;
CREATE TYPE public.invoice_type AS ENUM ('rent', 'security_deposit', 'maintenance', 'utility', 'other');

DROP TYPE IF EXISTS public.invoice_status CASCADE;
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid');

DROP TYPE IF EXISTS public.payment_terms CASCADE;
CREATE TYPE public.payment_terms AS ENUM ('immediate', '15_days', '30_days');

DROP TYPE IF EXISTS public.service_request_status CASCADE;
CREATE TYPE public.service_request_status AS ENUM ('open', 'in_progress', 'completed', 'closed', 'cancelled');

DROP TYPE IF EXISTS public.service_request_priority CASCADE;
CREATE TYPE public.service_request_priority AS ENUM ('low', 'medium', 'high', 'urgent');

DROP TYPE IF EXISTS public.id_type CASCADE;
CREATE TYPE public.id_type AS ENUM ('national_id', 'passport', 'trade_licence', 'residence_visa');

-- ============================================================
-- 2. USER_PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'admin'::public.user_role,
  is_active BOOLEAN NOT NULL DEFAULT true,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- ============================================================
-- 3. PROJECTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- ============================================================
-- 4. PROPERTIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  property_type public.property_type NOT NULL DEFAULT 'office'::public.property_type,
  total_floors INTEGER DEFAULT 1,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_project_id ON public.properties(project_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);

-- ============================================================
-- 5. UNITS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor_number INTEGER DEFAULT 0,
  unit_type public.property_type NOT NULL DEFAULT 'office'::public.property_type,
  area_sqft NUMERIC,
  status public.unit_status NOT NULL DEFAULT 'vacant'::public.unit_status,
  monthly_rent NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);

-- ============================================================
-- 6. TENANTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  id_type public.id_type DEFAULT 'national_id'::public.id_type,
  id_number TEXT,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);

-- ============================================================
-- 7. LEASES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  payment_terms public.payment_terms NOT NULL DEFAULT 'immediate'::public.payment_terms,
  status public.lease_status NOT NULL DEFAULT 'draft'::public.lease_status,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON public.leases(end_date);

-- ============================================================
-- 8. CO_TENANTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.co_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  share_percentage NUMERIC DEFAULT 100 CHECK (share_percentage > 0 AND share_percentage <= 100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_co_tenants_lease_id ON public.co_tenants(lease_id);
CREATE INDEX IF NOT EXISTS idx_co_tenants_tenant_id ON public.co_tenants(tenant_id);

-- ============================================================
-- 9. CO_LANDLORDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.co_landlords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ownership_percentage NUMERIC DEFAULT 100 CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_co_landlords_unit_id ON public.co_landlords(unit_id);
CREATE INDEX IF NOT EXISTS idx_co_landlords_landlord_id ON public.co_landlords(landlord_id);

-- ============================================================
-- 10. INVOICES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type public.invoice_type NOT NULL DEFAULT 'rent'::public.invoice_type,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_terms public.payment_terms NOT NULL DEFAULT 'immediate'::public.payment_terms,
  due_date DATE,
  status public.invoice_status NOT NULL DEFAULT 'draft'::public.invoice_status,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_lease_id ON public.invoices(lease_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- ============================================================
-- 11. PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- ============================================================
-- 12. SERVICE_REQUESTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  raised_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority public.service_request_priority NOT NULL DEFAULT 'medium'::public.service_request_priority,
  status public.service_request_status NOT NULL DEFAULT 'open'::public.service_request_status,
  is_common_area BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_unit_id ON public.service_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_priority ON public.service_requests(priority);

-- ============================================================
-- 13. LEASE_RENEWALS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lease_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  new_lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  renewal_date DATE,
  new_start_date DATE,
  new_end_date DATE,
  new_rent_amount NUMERIC,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_renewals_original_lease_id ON public.lease_renewals(original_lease_id);

-- ============================================================
-- 14. BULK_UPLOAD_LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bulk_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_entity_type ON public.bulk_upload_logs(entity_type);

-- ============================================================
-- 15. NOTIFICATION_SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  lease_expiry_alerts BOOLEAN DEFAULT true,
  invoice_reminders BOOLEAN DEFAULT true,
  maintenance_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- ============================================================
-- 16. USER_PROJECT_ASSIGNMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_project_assignments_user_id ON public.user_project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_assignments_project_id ON public.user_project_assignments(project_id);

-- ============================================================
-- 17. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_base()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_properties_updated_at ON public.properties;
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_units_updated_at ON public.units;
CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_leases_updated_at ON public.leases;
CREATE TRIGGER trg_leases_updated_at BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_base();

-- ============================================================
-- 18. ENABLE RLS ON ALL BASE TABLES
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 19. INITIAL RLS POLICIES (open for authenticated — refined in later migrations)
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_user_profiles" ON public.user_profiles;
CREATE POLICY "authenticated_all_user_profiles" ON public.user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_projects" ON public.projects;
CREATE POLICY "authenticated_all_projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_properties" ON public.properties;
CREATE POLICY "authenticated_all_properties" ON public.properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_units" ON public.units;
CREATE POLICY "authenticated_all_units" ON public.units FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_tenants" ON public.tenants;
CREATE POLICY "authenticated_all_tenants" ON public.tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_leases" ON public.leases;
CREATE POLICY "authenticated_all_leases" ON public.leases FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_co_tenants" ON public.co_tenants;
CREATE POLICY "authenticated_all_co_tenants" ON public.co_tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_co_landlords" ON public.co_landlords;
CREATE POLICY "authenticated_all_co_landlords" ON public.co_landlords FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_invoices" ON public.invoices;
CREATE POLICY "authenticated_all_invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_payments" ON public.payments;
CREATE POLICY "authenticated_all_payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_service_requests" ON public.service_requests;
CREATE POLICY "authenticated_all_service_requests" ON public.service_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_lease_renewals" ON public.lease_renewals;
CREATE POLICY "authenticated_all_lease_renewals" ON public.lease_renewals FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_bulk_upload_logs" ON public.bulk_upload_logs;
CREATE POLICY "authenticated_all_bulk_upload_logs" ON public.bulk_upload_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_notification_settings" ON public.notification_settings;
CREATE POLICY "authenticated_all_notification_settings" ON public.notification_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
