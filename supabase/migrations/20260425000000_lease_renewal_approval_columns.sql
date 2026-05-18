-- Add approval workflow columns to leases table for renewal tracking
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS invoice_source text,
  ADD COLUMN IF NOT EXISTS original_lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL;
