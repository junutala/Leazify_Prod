-- ─── Add new lease statuses to lease_status enum ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'absconding' AND enumtypid = 'lease_status'::regtype) THEN
    ALTER TYPE lease_status ADD VALUE 'absconding';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rent_committee' AND enumtypid = 'lease_status'::regtype) THEN
    ALTER TYPE lease_status ADD VALUE 'rent_committee';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'court_sealed' AND enumtypid = 'lease_status'::regtype) THEN
    ALTER TYPE lease_status ADD VALUE 'court_sealed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'court_released' AND enumtypid = 'lease_status'::regtype) THEN
    ALTER TYPE lease_status ADD VALUE 'court_released';
  END IF;
END $$;

-- ─── Extend payments table with payment method detail columns ─────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cheque_number text,
  ADD COLUMN IF NOT EXISTS cheque_date date,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS transfer_reference text,
  ADD COLUMN IF NOT EXISTS online_transaction_id text,
  ADD COLUMN IF NOT EXISTS online_gateway text,
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;

-- ─── Create receipt_number sequence for auto-numbering ───────────────────────
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1000;

-- ─── Index for faster invoice payment lookups ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_is_reconciled ON public.payments(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
