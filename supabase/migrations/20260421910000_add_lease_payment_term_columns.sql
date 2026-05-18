-- Add missing columns to leases table that are referenced in the leasing UI
-- sd_payment_term: security deposit payment term
-- turnover_payment_term: alias for turnover_rent_payment_term used in leasing client

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS sd_payment_term TEXT DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS turnover_payment_term TEXT DEFAULT 'monthly';
