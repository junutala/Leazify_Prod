-- Audit Logs Migration
-- Tracks all entity changes: project edits, lease approvals, invoice generation
-- with timestamp, user, action type, and before/after values

-- ============================================================
-- 1. AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,           -- 'project', 'lease', 'invoice', 'work_order', etc.
  entity_id UUID,                       -- ID of the changed entity
  entity_label TEXT,                    -- Human-readable label (e.g. lease number, project name)
  action TEXT NOT NULL,                 -- 'created', 'updated', 'approved', 'rejected', 'deleted', 'generated'
  performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  performed_by_email TEXT,              -- Denormalized for display even if user deleted
  before_values JSONB,                  -- Snapshot of values before change
  after_values JSONB,                   -- Snapshot of values after change
  metadata JSONB,                       -- Extra context (e.g. reason, source)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ============================================================
-- 3. ENABLE RLS
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Staff can read all audit logs
DROP POLICY IF EXISTS "staff_read_audit_logs" ON public.audit_logs;
CREATE POLICY "staff_read_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert audit logs (app writes on behalf of user)
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- No updates or deletes on audit logs (immutable)
