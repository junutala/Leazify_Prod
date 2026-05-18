-- Service Provider Enhancements Migration
-- 1. Add skills array to service_providers (multi-skill support)
-- 2. Add quote_submissions table
-- 3. Add RLS so providers can see open SRs/MRs matching their skills and assigned projects
-- 4. Add quote_status to service_requests and maintenance_requests

-- ============================================================
-- 0. ADD PROVIDER_ID TO USER_PROFILES (links auth user → service provider)
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_provider_id ON public.user_profiles(provider_id);

-- ============================================================
-- 1. ENSURE REQUIRED HELPER FUNCTIONS EXIST
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

CREATE OR REPLACE FUNCTION public.get_current_provider_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT provider_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- 2. ADD SKILLS ARRAY TO SERVICE_PROVIDERS
-- ============================================================

ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Migrate existing skill_type into skills array if skills is empty
UPDATE public.service_providers
SET skills = ARRAY[skill_type::TEXT]
WHERE (skills IS NULL OR array_length(skills, 1) IS NULL)
  AND skill_type IS NOT NULL;

-- ============================================================
-- 3. ADD QUOTE_SUBMISSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('sr', 'mr')),
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
  maintenance_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  quote_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_provider ON public.quote_submissions(provider_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_sr ON public.quote_submissions(service_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_mr ON public.quote_submissions(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_status ON public.quote_submissions(status);

-- ============================================================
-- 4. ADD QUOTE_STATUS COLUMNS TO SR AND MR
-- ============================================================

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'none' CHECK (quote_status IN ('none', 'submitted', 'approved', 'rejected'));

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'none' CHECK (quote_status IN ('none', 'submitted', 'approved', 'rejected'));

-- ============================================================
-- 5. RLS FOR QUOTE_SUBMISSIONS
-- ============================================================

ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_quote_submissions" ON public.quote_submissions;
DROP POLICY IF EXISTS "provider_manage_own_quotes" ON public.quote_submissions;

-- Staff can see and manage all quotes
CREATE POLICY "staff_all_quote_submissions"
ON public.quote_submissions
FOR ALL
TO authenticated
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

-- Providers can insert and view their own quotes
CREATE POLICY "provider_manage_own_quotes"
ON public.quote_submissions
FOR ALL
TO authenticated
USING (provider_id = public.get_current_provider_id())
WITH CHECK (provider_id = public.get_current_provider_id());

-- ============================================================
-- 6. RLS FOR PROVIDERS TO VIEW OPEN SERVICE REQUESTS
-- ============================================================

DROP POLICY IF EXISTS "provider_view_open_service_requests" ON public.service_requests;

CREATE POLICY "provider_view_open_service_requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  status = 'open'
  AND public.get_current_provider_id() IS NOT NULL
  AND (
    -- Provider's skills overlap with the request's skill_type
    skill_type::TEXT = ANY(
      SELECT unnest(skills) FROM public.service_providers WHERE id = public.get_current_provider_id()
    )
  )
);

-- ============================================================
-- 7. RLS FOR PROVIDERS TO VIEW OPEN MAINTENANCE REQUESTS
-- ============================================================

DROP POLICY IF EXISTS "provider_view_open_maintenance_requests" ON public.maintenance_requests;

CREATE POLICY "provider_view_open_maintenance_requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (
  status = 'open'
  AND public.get_current_provider_id() IS NOT NULL
  AND (
    -- Provider's skills overlap with the request's skill_type
    skill_type::TEXT = ANY(
      SELECT unnest(skills) FROM public.service_providers WHERE id = public.get_current_provider_id()
    )
  )
  AND (
    -- Provider is assigned to the project
    project_id IN (
      SELECT project_id FROM public.provider_project_assignments
      WHERE provider_id = public.get_current_provider_id()
    )
    OR project_id IS NULL
  )
);

-- ============================================================
-- 8. RLS FOR PROVIDER_PROJECT_ASSIGNMENTS (provider can view own)
-- ============================================================

DROP POLICY IF EXISTS "provider_view_own_assignments" ON public.provider_project_assignments;

CREATE POLICY "provider_view_own_assignments"
ON public.provider_project_assignments
FOR SELECT
TO authenticated
USING (provider_id = public.get_current_provider_id());
