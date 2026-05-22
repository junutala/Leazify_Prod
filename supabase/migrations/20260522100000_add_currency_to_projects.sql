-- Add currency field to projects table
-- Supports multi-currency per project (AED, KWD, USD, SAR, QAR, BHD, OMR)

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'AED';

-- Add an index for currency lookups
CREATE INDEX IF NOT EXISTS idx_projects_currency ON public.projects(currency);

-- Update existing projects based on their country
DO $$
BEGIN
  -- Kuwait projects → KWD
  UPDATE public.projects SET currency = 'KWD' WHERE country = 'Kuwait' AND currency = 'AED';
  -- Saudi Arabia projects → SAR
  UPDATE public.projects SET currency = 'SAR' WHERE country = 'Saudi Arabia' AND currency = 'AED';
  -- Qatar projects → QAR
  UPDATE public.projects SET currency = 'QAR' WHERE country = 'Qatar' AND currency = 'AED';
  -- Bahrain projects → BHD
  UPDATE public.projects SET currency = 'BHD' WHERE country = 'Bahrain' AND currency = 'AED';
  -- Oman projects → OMR
  UPDATE public.projects SET currency = 'OMR' WHERE country = 'Oman' AND currency = 'AED';
  -- UAE projects stay AED (already default)
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Currency update skipped: %', SQLERRM;
END $$;
