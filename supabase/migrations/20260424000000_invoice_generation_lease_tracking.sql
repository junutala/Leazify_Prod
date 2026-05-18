-- Invoice Generation Lease Tracking
-- Adds lease_id linkage and invoice_source tracking to invoices table
-- Adds generated_invoice_types to leases for deduplication

-- Add invoice_source column to invoices if not exists
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_period_start DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_period_end DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_type_ext TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vat_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Ensure lease_id column exists on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL;

-- Index for fast deduplication lookups
CREATE INDEX IF NOT EXISTS idx_invoices_lease_id_type ON public.invoices(lease_id, invoice_type_ext);
CREATE INDEX IF NOT EXISTS idx_invoices_source ON public.invoices(invoice_source);
