-- Service Provider Portal Migration
-- Links service_providers to user_profiles via provider_id column
-- Adds RLS policies so providers can only see their own work orders and linked invoices

-- ============================================================
-- 1. LINK SERVICE PROVIDERS TO USER_PROFILES
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_provider_id ON public.user_profiles(provider_id);

-- ============================================================
-- 2. HELPER FUNCTION: Get provider_id for current user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_provider_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT provider_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- 3. HELPER FUNCTION: Check if current user is a service provider
-- ============================================================

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
-- 4. RLS POLICIES FOR WORK_ORDERS
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "provider_view_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "provider_update_own_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "staff_all_work_orders" ON public.work_orders;

-- Staff can do everything
CREATE POLICY "staff_all_work_orders"
ON public.work_orders
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Providers can view their own work orders
CREATE POLICY "provider_view_own_work_orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (
  provider_id IS NOT NULL
  AND provider_id = public.get_current_provider_id()
);

-- Providers can update status on their own work orders
CREATE POLICY "provider_update_own_work_orders"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (
  provider_id IS NOT NULL
  AND provider_id = public.get_current_provider_id()
)
WITH CHECK (
  provider_id IS NOT NULL
  AND provider_id = public.get_current_provider_id()
);

-- ============================================================
-- 5. RLS POLICIES FOR INVOICES (provider can view work_order invoices)
-- ============================================================

DROP POLICY IF EXISTS "provider_view_own_invoices" ON public.invoices;

-- Providers can view invoices linked to their work orders
CREATE POLICY "provider_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  work_order_id IN (
    SELECT id FROM public.work_orders
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 6. RLS POLICIES FOR WORK_ORDER_SERVICE_REQUESTS (provider read)
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_work_order_service_requests" ON public.work_order_service_requests;
DROP POLICY IF EXISTS "provider_view_own_work_order_service_requests" ON public.work_order_service_requests;
DROP POLICY IF EXISTS "staff_all_work_order_service_requests" ON public.work_order_service_requests;

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
  work_order_id IN (
    SELECT id FROM public.work_orders
    WHERE provider_id = public.get_current_provider_id()
  )
);

-- ============================================================
-- 7. RLS POLICIES FOR SERVICE_PROVIDERS (provider can view own record)
-- ============================================================

DROP POLICY IF EXISTS "authenticated_all_service_providers" ON public.service_providers;
DROP POLICY IF EXISTS "provider_view_own_record" ON public.service_providers;
DROP POLICY IF EXISTS "staff_all_service_providers" ON public.service_providers;

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
USING (id = public.get_current_provider_id());

-- ============================================================
-- 8. MOCK SERVICE PROVIDER AUTH USER (for testing)
-- ============================================================

DO $$
DECLARE
  provider_auth_id UUID := gen_random_uuid();
  existing_provider_id UUID;
BEGIN
  -- Get first active service provider
  SELECT id INTO existing_provider_id FROM public.service_providers WHERE is_active = true ORDER BY created_at LIMIT 1;

  IF existing_provider_id IS NULL THEN
    RAISE NOTICE 'No active service providers found, skipping provider mock user creation';
    RETURN;
  END IF;

  -- Create auth user for provider
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    provider_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'provider@propflow.io', crypt('provider123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Demo Provider', 'role', 'viewer'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Update user_profiles to link to service provider
  UPDATE public.user_profiles
  SET provider_id = existing_provider_id
  WHERE id = provider_auth_id;

  -- Also auto-link any existing user_profiles whose email matches a service provider email
  UPDATE public.user_profiles up
  SET provider_id = sp.id
  FROM public.service_providers sp
  WHERE up.email = sp.email
  AND up.provider_id IS NULL;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Provider mock user creation failed: %', SQLERRM;
END $$;
