-- Add user_id to persons table for landlord portal access
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
