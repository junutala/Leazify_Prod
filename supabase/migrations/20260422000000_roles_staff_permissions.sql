-- ============================================================
-- Roles, Staff & Permission-Based Access Control
-- ============================================================

-- 1. ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name ON public.roles (lower(name));

-- 2. ROLE PERMISSIONS TABLE (sidebar nav item keys)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  nav_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_nav ON public.role_permissions (role_id, nav_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions (role_id);

-- 3. STAFF TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_email ON public.staff (lower(email));
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff (user_id);

-- 4. STAFF PROJECT ROLE ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_role_assignments_unique ON public.staff_role_assignments (staff_id, project_id, role_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_staff_id ON public.staff_role_assignments (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_project_id ON public.staff_role_assignments (project_id);

-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
-- ============================================================

-- roles: authenticated users can read; only admins can write (permissive for now)
DROP POLICY IF EXISTS "roles_all_authenticated" ON public.roles;
CREATE POLICY "roles_all_authenticated"
ON public.roles FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- role_permissions
DROP POLICY IF EXISTS "role_permissions_all_authenticated" ON public.role_permissions;
CREATE POLICY "role_permissions_all_authenticated"
ON public.role_permissions FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- staff
DROP POLICY IF EXISTS "staff_all_authenticated" ON public.staff;
CREATE POLICY "staff_all_authenticated"
ON public.staff FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- staff_role_assignments
DROP POLICY IF EXISTS "staff_role_assignments_all_authenticated" ON public.staff_role_assignments;
CREATE POLICY "staff_role_assignments_all_authenticated"
ON public.staff_role_assignments FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
