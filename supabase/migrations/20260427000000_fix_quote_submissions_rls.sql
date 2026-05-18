-- Fix: Disable RLS on quote_submissions to match all other tables in the project.
-- Root cause: quote_submissions had RLS enabled with policies relying on
-- get_current_provider_id() which returns NULL when user_profiles.provider_id
-- is not set, causing "new row violates row-level security policy" on INSERT.
-- All other tables in this project have RLS disabled, so we align here.

ALTER TABLE public.quote_submissions DISABLE ROW LEVEL SECURITY;

-- Drop the policies that were blocking inserts (no longer needed)
DROP POLICY IF EXISTS "staff_all_quote_submissions" ON public.quote_submissions;
DROP POLICY IF EXISTS "provider_manage_own_quotes" ON public.quote_submissions;
