-- Add charge fields to service_requests and maintenance_requests
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS charge_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_submitted BOOLEAN DEFAULT false;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS charge_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_submitted BOOLEAN DEFAULT false;

-- Add RLS policies for new columns (already covered by existing policies)
-- No additional policies needed as existing authenticated_all policies cover all columns
