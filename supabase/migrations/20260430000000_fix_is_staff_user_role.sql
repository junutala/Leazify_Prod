-- ============================================================
-- Fix is_staff_user() to include 'staff' role
--
-- Root cause: Staff users created via the staff creation API
-- receive role = 'staff' in user_profiles, but is_staff_user()
-- only checked for ('admin', 'manager', 'operations', 'landlord',
-- 'portal_owner'). This caused all RLS policies using
-- is_staff_user() (leases, invoices, service_requests, etc.)
-- to block staff users from reading any data.
--
-- Note: 'staff' is NOT a value in the user_role enum, so we
-- rely on the staff table check to cover staff users instead.
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
  )
  OR EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$;

-- Also ensure is_admin_user() is correct
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

-- Ensure staff_project_assignments allows admins to read all rows
-- (needed for the project-assignment management screen)
ALTER TABLE public.staff_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_assignments_manage_own" ON public.staff_project_assignments;
CREATE POLICY "staff_assignments_manage_own"
    ON public.staff_project_assignments
    FOR ALL
    TO authenticated
    USING (
      user_id = auth.uid()
      OR public.is_admin_user()
    )
    WITH CHECK (
      user_id = auth.uid()
      OR public.is_admin_user()
    );
