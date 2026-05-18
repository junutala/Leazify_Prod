-- PropFlow Full Schema Migration
-- Adds: buildings, floors, persons, service_providers, skill_types, usage_types,
--       maintenance_requests, work_orders, turnover_rent, vat_config, lease enhancements

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS public.person_type CASCADE;
CREATE TYPE public.person_type AS ENUM ('company', 'individual');

DROP TYPE IF EXISTS public.skill_type CASCADE;
CREATE TYPE public.skill_type AS ENUM ('electrical', 'mechanical', 'painting', 'plumbing', 'cleaning');

DROP TYPE IF EXISTS public.usage_type CASCADE;
CREATE TYPE public.usage_type AS ENUM ('residential', 'office', 'retail', 'mall');

DROP TYPE IF EXISTS public.mall_store_type CASCADE;
CREATE TYPE public.mall_store_type AS ENUM ('anchor', 'apparel', 'electronics', 'food_courts', 'entertainment', 'convenience', 'book_stores', 'kiosks', 'speciality');

DROP TYPE IF EXISTS public.contact_type CASCADE;
CREATE TYPE public.contact_type AS ENUM ('finance', 'admin', 'security', 'emergency');

DROP TYPE IF EXISTS public.payment_method CASCADE;
CREATE TYPE public.payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'online_payment');

DROP TYPE IF EXISTS public.maintenance_status CASCADE;
CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'completed', 'closed', 'cancelled');

DROP TYPE IF EXISTS public.work_order_status CASCADE;
CREATE TYPE public.work_order_status AS ENUM ('draft', 'issued', 'in_progress', 'completed', 'cancelled');

DROP TYPE IF EXISTS public.payer_type CASCADE;
CREATE TYPE public.payer_type AS ENUM ('tenant', 'landlord');

DROP TYPE IF EXISTS public.invoice_type_ext CASCADE;
CREATE TYPE public.invoice_type_ext AS ENUM ('rent', 'security_deposit', 'turnover_rent', 'amc', 'miscellaneous', 'work_order');

DROP TYPE IF EXISTS public.turnover_rent_status CASCADE;
CREATE TYPE public.turnover_rent_status AS ENUM ('draft', 'confirmed', 'invoiced');

-- ============================================================
-- 2. EXTEND EXISTING TABLES
-- ============================================================

-- Extend projects with full fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United Arab Emirates',
  ADD COLUMN IF NOT EXISTS usage_type public.usage_type DEFAULT 'office'::public.usage_type,
  ADD COLUMN IF NOT EXISTS number_of_buildings INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS geo_location TEXT,
  ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- ============================================================
-- 3. BUILDINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  number_of_floors INTEGER DEFAULT 1,
  usage_type public.usage_type DEFAULT 'office'::public.usage_type,
  geo_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. FLOORS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  number_of_units INTEGER DEFAULT 0,
  usage_type public.usage_type DEFAULT 'office'::public.usage_type,
  geo_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. EXTEND UNITS TABLE
-- ============================================================

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS gla_sqft NUMERIC,
  ADD COLUMN IF NOT EXISTS usage_type public.usage_type DEFAULT 'office'::public.usage_type,
  ADD COLUMN IF NOT EXISTS lockable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mall_store_type public.mall_store_type,
  ADD COLUMN IF NOT EXISTS num_balconies INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_bedrooms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kitchen_type TEXT,
  ADD COLUMN IF NOT EXISTS num_car_parks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pantry_type TEXT,
  ADD COLUMN IF NOT EXISTS washroom_type TEXT,
  ADD COLUMN IF NOT EXISTS parking TEXT,
  ADD COLUMN IF NOT EXISTS guest_parking BOOLEAN DEFAULT false;

-- ============================================================
-- 6. PERSONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_type public.person_type NOT NULL DEFAULT 'individual'::public.person_type,
  name TEXT NOT NULL,
  trade_licence_no TEXT,
  trade_licence_expiry DATE,
  national_id TEXT,
  national_id_expiry DATE,
  email TEXT,
  mobile TEXT,
  contact_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Person additional contacts
CREATE TABLE IF NOT EXISTS public.person_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_mobile TEXT,
  contact_type public.contact_type DEFAULT 'admin'::public.contact_type,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. SERVICE PROVIDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_type public.person_type NOT NULL DEFAULT 'company'::public.person_type,
  name TEXT NOT NULL,
  trade_licence_no TEXT,
  trade_licence_expiry DATE,
  national_id TEXT,
  national_id_expiry DATE,
  skill_type public.skill_type NOT NULL,
  email TEXT,
  mobile TEXT,
  contact_address TEXT,
  response_time_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service provider project assignments
CREATE TABLE IF NOT EXISTS public.provider_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, project_id)
);

-- ============================================================
-- 8. ESTATE ASSIGNMENTS (Unit Ownership)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.estate_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  ownership_percentage NUMERIC NOT NULL DEFAULT 100 CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. EXTEND LEASES TABLE
-- ============================================================

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS lessee_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS annual_increment_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turnover_rent_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turnover_rent_payment_term TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS amc_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amc_payment_term TEXT DEFAULT 'annually',
  ADD COLUMN IF NOT EXISTS lease_number TEXT,
  ADD COLUMN IF NOT EXISTS contract_generated BOOLEAN DEFAULT false;

-- Co-lessees (extend co_tenants with person reference)
ALTER TABLE public.co_tenants
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS lease_end_date DATE,
  ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_increment_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amc_amount NUMERIC DEFAULT 0;

-- ============================================================
-- 10. MAINTENANCE REQUESTS TABLE (Common Area - Landlord Paid)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  area_description TEXT,
  skill_type public.skill_type NOT NULL,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  image_urls JSONB DEFAULT '[]'::jsonb,
  payer public.payer_type NOT NULL DEFAULT 'landlord'::public.payer_type,
  status public.maintenance_status DEFAULT 'open'::public.maintenance_status,
  raised_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extend service_requests with skill_type and provider
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS skill_type public.skill_type,
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payer public.payer_type NOT NULL DEFAULT 'tenant'::public.payer_type;

-- ============================================================
-- 11. WORK ORDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number TEXT UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  skill_type public.skill_type NOT NULL,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  amount NUMERIC DEFAULT 0,
  payment_terms TEXT DEFAULT 'immediate',
  other_instructions TEXT,
  payer public.payer_type NOT NULL DEFAULT 'landlord'::public.payer_type,
  status public.work_order_status DEFAULT 'draft'::public.work_order_status,
  raised_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work order linked service requests
CREATE TABLE IF NOT EXISTS public.work_order_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
  maintenance_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. TURNOVER RENT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.turnover_rent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  monthly_sales NUMERIC DEFAULT 0,
  turnover_rent_pct NUMERIC DEFAULT 0,
  calculated_amount NUMERIC GENERATED ALWAYS AS (monthly_sales * turnover_rent_pct / 100) STORED,
  status public.turnover_rent_status DEFAULT 'draft'::public.turnover_rent_status,
  confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, month, year)
);

-- ============================================================
-- 13. VAT CONFIGURATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vat_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  vat_number TEXT,
  rent_vat_pct NUMERIC DEFAULT 5,
  security_deposit_vat_pct NUMERIC DEFAULT 0,
  turnover_rent_vat_pct NUMERIC DEFAULT 5,
  amc_vat_pct NUMERIC DEFAULT 5,
  misc_vat_pct NUMERIC DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 14. EXTEND INVOICES TABLE
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type_ext public.invoice_type_ext DEFAULT 'rent'::public.invoice_type_ext,
  ADD COLUMN IF NOT EXISTS invoice_period_start DATE,
  ADD COLUMN IF NOT EXISTS invoice_period_end DATE,
  ADD COLUMN IF NOT EXISTS vat_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 15. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_buildings_project_id ON public.buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_floors_building_id ON public.floors(building_id);
CREATE INDEX IF NOT EXISTS idx_units_floor_id ON public.units(floor_id);
CREATE INDEX IF NOT EXISTS idx_persons_name ON public.persons(name);
CREATE INDEX IF NOT EXISTS idx_service_providers_skill ON public.service_providers(skill_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_project ON public.maintenance_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_provider ON public.work_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_turnover_rent_unit ON public.turnover_rent(unit_id);
CREATE INDEX IF NOT EXISTS idx_turnover_rent_year_month ON public.turnover_rent(year, month);
CREATE INDEX IF NOT EXISTS idx_estate_assignments_unit ON public.estate_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_provider_project_provider ON public.provider_project_assignments(provider_id);

-- ============================================================
-- 16. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.work_orders;
  NEW.wo_number := 'WO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- ============================================================
-- 17. ENABLE RLS
-- ============================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnover_rent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 18. RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_buildings" ON public.buildings;
CREATE POLICY "authenticated_all_buildings" ON public.buildings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_floors" ON public.floors;
CREATE POLICY "authenticated_all_floors" ON public.floors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_persons" ON public.persons;
CREATE POLICY "authenticated_all_persons" ON public.persons FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_person_contacts" ON public.person_contacts;
CREATE POLICY "authenticated_all_person_contacts" ON public.person_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_service_providers" ON public.service_providers;
CREATE POLICY "authenticated_all_service_providers" ON public.service_providers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_provider_assignments" ON public.provider_project_assignments;
CREATE POLICY "authenticated_all_provider_assignments" ON public.provider_project_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_estate_assignments" ON public.estate_assignments;
CREATE POLICY "authenticated_all_estate_assignments" ON public.estate_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_maintenance_requests" ON public.maintenance_requests;
CREATE POLICY "authenticated_all_maintenance_requests" ON public.maintenance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_work_orders" ON public.work_orders;
CREATE POLICY "authenticated_all_work_orders" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_wo_sr" ON public.work_order_service_requests;
CREATE POLICY "authenticated_all_wo_sr" ON public.work_order_service_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_turnover_rent" ON public.turnover_rent;
CREATE POLICY "authenticated_all_turnover_rent" ON public.turnover_rent FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_vat_config" ON public.vat_config;
CREATE POLICY "authenticated_all_vat_config" ON public.vat_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 19. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_buildings_updated_at ON public.buildings;
CREATE TRIGGER trg_buildings_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_floors_updated_at ON public.floors;
CREATE TRIGGER trg_floors_updated_at BEFORE UPDATE ON public.floors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_persons_updated_at ON public.persons;
CREATE TRIGGER trg_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_service_providers_updated_at ON public.service_providers;
CREATE TRIGGER trg_service_providers_updated_at BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_requests_updated_at ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_turnover_rent_updated_at ON public.turnover_rent;
CREATE TRIGGER trg_turnover_rent_updated_at BEFORE UPDATE ON public.turnover_rent FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_vat_config_updated_at ON public.vat_config;
CREATE TRIGGER trg_vat_config_updated_at BEFORE UPDATE ON public.vat_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_work_orders_wo_number ON public.work_orders;
CREATE TRIGGER trg_work_orders_wo_number BEFORE INSERT ON public.work_orders FOR EACH ROW WHEN (NEW.wo_number IS NULL) EXECUTE FUNCTION public.generate_wo_number();

-- ============================================================
-- 20. MOCK DATA
-- ============================================================

DO $$
DECLARE
  proj1_id UUID;
  proj2_id UUID;
  bldg1_id UUID := gen_random_uuid();
  bldg2_id UUID := gen_random_uuid();
  floor1_id UUID := gen_random_uuid();
  floor2_id UUID := gen_random_uuid();
  floor3_id UUID := gen_random_uuid();
  prov1_id UUID := gen_random_uuid();
  prov2_id UUID := gen_random_uuid();
  person1_id UUID := gen_random_uuid();
  person2_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO proj1_id FROM public.projects ORDER BY created_at LIMIT 1;
  SELECT id INTO proj2_id FROM public.projects ORDER BY created_at OFFSET 1 LIMIT 1;

  IF proj1_id IS NULL THEN
    RAISE NOTICE 'No projects found, skipping mock data';
    RETURN;
  END IF;

  -- Update projects with extended fields
  UPDATE public.projects SET
    address = 'Sheikh Zayed Road, DIFC',
    city = 'Dubai',
    country = 'United Arab Emirates',
    usage_type = 'office'::public.usage_type,
    number_of_buildings = 2,
    vat_registered = true,
    vat_number = '100234567890003'
  WHERE id = proj1_id;

  IF proj2_id IS NOT NULL THEN
    UPDATE public.projects SET
      address = 'Al Maryah Island',
      city = 'Abu Dhabi',
      country = 'United Arab Emirates',
      usage_type = 'mall'::public.usage_type,
      number_of_buildings = 1,
      vat_registered = true,
      vat_number = '100987654321001'
    WHERE id = proj2_id;
  END IF;

  -- Buildings
  INSERT INTO public.buildings (id, project_id, name, address, number_of_floors, usage_type)
  VALUES
    (bldg1_id, proj1_id, 'Tower A', 'Block A, Sheikh Zayed Road', 6, 'office'::public.usage_type),
    (bldg2_id, proj1_id, 'Tower B', 'Block B, Sheikh Zayed Road', 4, 'office'::public.usage_type)
  ON CONFLICT (id) DO NOTHING;

  -- Floors
  INSERT INTO public.floors (id, building_id, name, description, number_of_units, usage_type)
  VALUES
    (floor1_id, bldg1_id, 'Ground Floor', 'Ground level retail and lobby', 4, 'office'::public.usage_type),
    (floor2_id, bldg1_id, 'Level 2', 'Second floor offices', 6, 'office'::public.usage_type),
    (floor3_id, bldg2_id, 'Ground Floor', 'Ground level', 3, 'office'::public.usage_type)
  ON CONFLICT (id) DO NOTHING;

  -- Persons
  INSERT INTO public.persons (id, person_type, name, trade_licence_no, email, mobile, contact_address)
  VALUES
    (person1_id, 'company'::public.person_type, 'Vertex Analytics Ltd', 'TL-2024-001234', 'contact@vertex.ae', '+971501234567', 'DIFC, Dubai, UAE'),
    (person2_id, 'company'::public.person_type, 'TechSoft Solutions LLC', 'TL-2024-005678', 'info@techsoft.ae', '+971509876543', 'Business Bay, Dubai, UAE')
  ON CONFLICT (id) DO NOTHING;

  -- Service Providers
  INSERT INTO public.service_providers (id, person_type, name, skill_type, email, mobile, response_time_hours)
  VALUES
    (prov1_id, 'company'::public.person_type, 'ElectroPro Services LLC', 'electrical'::public.skill_type, 'ops@electropro.ae', '+971551234567', 4),
    (prov2_id, 'company'::public.person_type, 'AquaFix Plumbing Co.', 'plumbing'::public.skill_type, 'service@aquafix.ae', '+971559876543', 6)
  ON CONFLICT (id) DO NOTHING;

  -- Provider project assignments
  INSERT INTO public.provider_project_assignments (provider_id, project_id)
  VALUES (prov1_id, proj1_id), (prov2_id, proj1_id)
  ON CONFLICT (provider_id, project_id) DO NOTHING;

  -- VAT config
  INSERT INTO public.vat_config (project_id, vat_number, rent_vat_pct, security_deposit_vat_pct, turnover_rent_vat_pct, amc_vat_pct, misc_vat_pct)
  VALUES (proj1_id, '100234567890003', 5, 0, 5, 5, 5)
  ON CONFLICT (project_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data error: %', SQLERRM;
END $$;
