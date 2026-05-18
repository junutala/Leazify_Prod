-- Approval workflow: add approval_status to invoices and turnover_rent

-- Add approval_status to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS invoice_source TEXT DEFAULT 'manual' CHECK (invoice_source IN ('manual', 'lease_renewal', 'turnover_rent'));

-- Add approval_status to turnover_rent table
ALTER TABLE public.turnover_rent
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Index for fast pending lookups
CREATE INDEX IF NOT EXISTS idx_invoices_approval_status ON public.invoices(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_source ON public.invoices(invoice_source);
CREATE INDEX IF NOT EXISTS idx_turnover_rent_approval_status ON public.turnover_rent(approval_status);
