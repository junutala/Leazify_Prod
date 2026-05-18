-- Tenant Portal Migration
-- Links persons to user_profiles via person_id column
-- Adds RLS policies so tenants can only see their own leases and invoices

-- ============================================================
-- 1. LINK PERSONS TO USER_PROFILES
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_person_id ON public.user_profiles(person_id);

-- ============================================================
-- 2. HELPER FUNCTION: Get person_id for current user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_person_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT person_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- 3. HELPER FUNCTION: Check if current user is admin/manager
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
-- 4. RLS POLICIES FOR LEASES (tenant can view own leases)
-- ============================================================

-- Drop existing catch-all policy if present
DROP POLICY IF EXISTS "authenticated_all_leases" ON public.leases;
DROP POLICY IF EXISTS "tenant_view_own_leases" ON public.leases;
DROP POLICY IF EXISTS "staff_all_leases" ON public.leases;

-- Staff can do everything
CREATE POLICY "staff_all_leases"
ON public.leases
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Tenants can only view leases where they are the lessee
CREATE POLICY "tenant_view_own_leases"
ON public.leases
FOR SELECT
TO authenticated
USING (
  lessee_person_id IS NOT NULL
  AND lessee_person_id = public.get_current_person_id()
);

-- ============================================================
-- 5. RLS POLICIES FOR INVOICES (tenant can view own invoices)
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_invoices" ON public.invoices;
DROP POLICY IF EXISTS "tenant_view_own_invoices" ON public.invoices;
DROP POLICY IF EXISTS "staff_all_invoices" ON public.invoices;

-- Staff can do everything
CREATE POLICY "staff_all_invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Tenants can view invoices linked to their leases
CREATE POLICY "tenant_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  lease_id IN (
    SELECT id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

-- ============================================================
-- 6. RLS POLICIES FOR UNITS (tenants can view their leased units)
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_units" ON public.units;
DROP POLICY IF EXISTS "tenant_view_leased_units" ON public.units;
DROP POLICY IF EXISTS "staff_all_units" ON public.units;

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
  id IN (
    SELECT unit_id FROM public.leases
    WHERE lessee_person_id = public.get_current_person_id()
  )
);

-- ============================================================
-- 7. RLS POLICIES FOR FLOORS, BUILDINGS, PROJECTS (read for tenants)
-- ============================================================

-- Floors
DROP POLICY IF EXISTS "authenticated_all_floors" ON public.floors;
DROP POLICY IF EXISTS "tenant_view_floors" ON public.floors;
DROP POLICY IF EXISTS "staff_all_floors" ON public.floors;

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
USING (true);

-- Buildings
DROP POLICY IF EXISTS "authenticated_all_buildings" ON public.buildings;
DROP POLICY IF EXISTS "tenant_view_buildings" ON public.buildings;
DROP POLICY IF EXISTS "staff_all_buildings" ON public.buildings;

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
USING (true);

-- Projects
DROP POLICY IF EXISTS "authenticated_all_projects" ON public.projects;
DROP POLICY IF EXISTS "tenant_view_projects" ON public.projects;
DROP POLICY IF EXISTS "staff_all_projects" ON public.projects;

CREATE POLICY "staff_all_projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

CREATE POLICY "tenant_view_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (true);

-- Persons (tenants can view their own person record)
DROP POLICY IF EXISTS "authenticated_all_persons" ON public.persons;
DROP POLICY IF EXISTS "tenant_view_own_person" ON public.persons;
DROP POLICY IF EXISTS "staff_all_persons" ON public.persons;

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
USING (id = public.get_current_person_id());

-- ============================================================
-- 8. MOCK TENANT USER (for testing)
-- Links an existing person to a new auth user with role=tenant
-- ============================================================

DO $$
DECLARE
  tenant_auth_id UUID := gen_random_uuid();
  existing_person_id UUID;
BEGIN
  -- Get first person from persons table
  SELECT id INTO existing_person_id FROM public.persons ORDER BY created_at LIMIT 1;

  IF existing_person_id IS NULL THEN
    RAISE NOTICE 'No persons found, skipping tenant mock user creation';
    RETURN;
  END IF;

  -- Create auth user for tenant
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    tenant_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'tenant@propflow.io', crypt('tenant123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Demo Tenant', 'role', 'tenant'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Update user_profiles to link to person and set role=tenant
  UPDATE public.user_profiles
  SET role = 'tenant', person_id = existing_person_id
  WHERE id = tenant_auth_id;

  -- Also update any existing user_profiles that have email matching persons
  UPDATE public.user_profiles up
  SET person_id = p.id
  FROM public.persons p
  WHERE up.email = p.email
  AND up.person_id IS NULL;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Tenant mock user creation failed: %', SQLERRM;
END $$;
