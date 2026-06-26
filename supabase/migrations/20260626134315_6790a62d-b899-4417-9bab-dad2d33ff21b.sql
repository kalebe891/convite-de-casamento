DROP POLICY IF EXISTS "Service role can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can insert user roles" ON public.user_roles;

CREATE POLICY "Service role can insert user roles"
ON public.user_roles
FOR INSERT
TO service_role
WITH CHECK (true);