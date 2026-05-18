-- Add missing 'status' column to projects table
-- This resolves the "Could not find the 'status' column of 'projects' in the schema cache" error

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Update any existing projects to have 'active' status
UPDATE public.projects SET status = 'active' WHERE status IS NULL;
