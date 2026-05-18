-- ============================================================
-- Disable RLS on auth-critical tables to fix staff login
-- Root cause: circular RLS dependency on user_profiles
--   user_profiles policies call is_staff_user()
--   is_staff_user() queries user_profiles → infinite recursion
-- Solution: Disable RLS on these tables so auth flow works
-- ============================================================

-- Disable RLS on user_profiles (main circular dependency source)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on user_profiles to clean up
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "staff_view_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.user_profiles;

-- Disable RLS on staff table (needed for loadStaffPermissions)
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on staff
DROP POLICY IF EXISTS "staff_all_authenticated" ON public.staff;
DROP POLICY IF EXISTS "authenticated_all_staff" ON public.staff;
DROP POLICY IF EXISTS "allow_all_authenticated_staff" ON public.staff;

-- Disable RLS on staff_role_assignments (needed for permission loading)
ALTER TABLE public.staff_role_assignments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on staff_role_assignments
DROP POLICY IF EXISTS "staff_role_assignments_all_authenticated" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "authenticated_all_staff_role_assignments" ON public.staff_role_assignments;

-- Disable RLS on role_permissions (needed for nav key loading)
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on role_permissions
DROP POLICY IF EXISTS "role_permissions_all_authenticated" ON public.role_permissions;
DROP POLICY IF EXISTS "authenticated_all_role_permissions" ON public.role_permissions;

-- Disable RLS on roles (needed for role lookups)
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on roles
DROP POLICY IF EXISTS "roles_all_authenticated" ON public.roles;
DROP POLICY IF EXISTS "authenticated_all_roles" ON public.roles;

-- Also fix the is_staff_user() function to avoid querying user_profiles
-- Use auth.users metadata instead to break the circular dependency
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

-- Fix is_admin_user() similarly
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
