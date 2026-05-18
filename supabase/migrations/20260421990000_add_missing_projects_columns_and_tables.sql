-- Fix: Add missing columns to projects table and create missing tables
-- Resolves: "Could not find the 'address' column of 'projects' in the schema cache"

-- ============================================================
-- 1. ENUM TYPES (idempotent)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'person_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.person_type AS ENUM ('company', 'individual');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.skill_type AS ENUM ('electrical', 'mechanical', 'painting', 'plumbing', 'cleaning');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usage_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.usage_type AS ENUM ('residential', 'office', 'retail', 'mall');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mall_store_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.mall_store_type AS ENUM ('anchor', 'apparel', 'electronics', 'food_courts', 'entertainment', 'convenience', 'book_stores', 'kiosks', 'speciality');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.contact_type AS ENUM ('finance', 'admin', 'security', 'emergency');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'online_payment');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'completed', 'closed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_order_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.work_order_status AS ENUM ('draft', 'issued', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payer_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.payer_type AS ENUM ('tenant', 'landlord');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type_ext' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.invoice_type_ext AS ENUM ('rent', 'security_deposit', 'turnover_rent', 'amc', 'miscellaneous', 'work_order');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'turnover_rent_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.turnover_rent_status AS ENUM ('draft', 'confirmed', 'invoiced');
  END IF;
END $$;

-- ============================================================
-- 2. ADD MISSING COLUMNS TO PROJECTS TABLE
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United Arab Emirates',
  ADD COLUMN IF NOT EXISTS usage_type public.usage_type DEFAULT 'office'::public.usage_type,
  ADD COLUMN IF NOT EXISTS number_of_buildings INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS geo_location TEXT,
  ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

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

CREATE TABLE IF NOT EXISTS public.provider_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, project_id)
);

-- ============================================================
-- 8. ESTATE ASSIGNMENTS
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

ALTER TABLE public.co_tenants
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS lease_end_date DATE,
  ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_increment_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amc_amount NUMERIC DEFAULT 0;

-- ============================================================
-- 10. MAINTENANCE REQUESTS TABLE
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
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_project_id ON public.maintenance_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON public.work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_turnover_rent_unit_id ON public.turnover_rent(unit_id);
CREATE INDEX IF NOT EXISTS idx_vat_config_project_id ON public.vat_config(project_id);

-- ============================================================
-- 16. RLS POLICIES
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

DROP POLICY IF EXISTS "authenticated_access_buildings" ON public.buildings;
CREATE POLICY "authenticated_access_buildings" ON public.buildings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_floors" ON public.floors;
CREATE POLICY "authenticated_access_floors" ON public.floors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_persons" ON public.persons;
CREATE POLICY "authenticated_access_persons" ON public.persons FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_person_contacts" ON public.person_contacts;
CREATE POLICY "authenticated_access_person_contacts" ON public.person_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_service_providers" ON public.service_providers;
CREATE POLICY "authenticated_access_service_providers" ON public.service_providers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_provider_project_assignments" ON public.provider_project_assignments;
CREATE POLICY "authenticated_access_provider_project_assignments" ON public.provider_project_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_estate_assignments" ON public.estate_assignments;
CREATE POLICY "authenticated_access_estate_assignments" ON public.estate_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_maintenance_requests" ON public.maintenance_requests;
CREATE POLICY "authenticated_access_maintenance_requests" ON public.maintenance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_work_orders" ON public.work_orders;
CREATE POLICY "authenticated_access_work_orders" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_work_order_service_requests" ON public.work_order_service_requests;
CREATE POLICY "authenticated_access_work_order_service_requests" ON public.work_order_service_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_turnover_rent" ON public.turnover_rent;
CREATE POLICY "authenticated_access_turnover_rent" ON public.turnover_rent FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_access_vat_config" ON public.vat_config;
CREATE POLICY "authenticated_access_vat_config" ON public.vat_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
