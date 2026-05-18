-- Extend payment_terms enum to support all terms used in the leasing UI
-- The existing enum only had: immediate, 15_days, 30_days
-- The leasing client also uses: quarterly, half_yearly, annually

ALTER TYPE public.payment_terms ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE public.payment_terms ADD VALUE IF NOT EXISTS 'half_yearly';
ALTER TYPE public.payment_terms ADD VALUE IF NOT EXISTS 'annually';
