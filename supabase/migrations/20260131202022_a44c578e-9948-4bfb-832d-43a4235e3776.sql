-- Remove the overly permissive INSERT policy on rsvps table
-- The rsvps should only be created via Edge Functions with rate limiting
DROP POLICY IF EXISTS "Anyone can create RSVPs" ON public.rsvps;

-- Create a new policy that only allows service role to insert (Edge Functions use service role)
-- This prevents direct client-side inserts and forces all inserts through the rate-limited Edge Function
CREATE POLICY "Service role can insert RSVPs"
ON public.rsvps
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Note: Edge Functions use service_role key which bypasses RLS, so they can still insert