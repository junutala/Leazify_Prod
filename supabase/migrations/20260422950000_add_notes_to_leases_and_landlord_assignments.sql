-- ─── 1. Add notes column to leases ───────────────────────────────────────────
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS notes text;

-- ─── 2. Create project_landlord_assignments table ────────────────────────────
-- Allows assigning persons as landlord/joint-landlord to any level of the
-- project hierarchy: project, building, floor, or unit.
-- Exactly one of (project_id, building_id, floor_id, unit_id) should be set.
CREATE TABLE IF NOT EXISTS public.project_landlord_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  landlord_type       text NOT NULL DEFAULT 'landlord' CHECK (landlord_type IN ('landlord', 'joint_landlord')),
  ownership_pct       numeric NOT NULL DEFAULT 0 CHECK (ownership_pct >= 0 AND ownership_pct <= 100),
  -- hierarchy level — exactly one should be non-null
  project_id          uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  building_id         uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_id            uuid REFERENCES public.floors(id) ON DELETE CASCADE,
  unit_id             uuid REFERENCES public.units(id) ON DELETE CASCADE,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  -- ensure at least one hierarchy level is set
  CONSTRAINT chk_one_hierarchy_level CHECK (
    (project_id IS NOT NULL)::int +
    (building_id IS NOT NULL)::int +
    (floor_id IS NOT NULL)::int +
    (unit_id IS NOT NULL)::int = 1
  )
);

-- Disable RLS to match the rest of the app's pattern
ALTER TABLE public.project_landlord_assignments DISABLE ROW LEVEL SECURITY;
