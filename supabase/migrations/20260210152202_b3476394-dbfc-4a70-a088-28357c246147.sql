
-- Drop the old 2-param overload that causes ambiguity
DROP FUNCTION IF EXISTS public.claim_gift(uuid, uuid);
