
-- Allow users with "usuarios" view permission to see all profiles
CREATE POLICY "Users with usuarios permission can view all profiles"
ON public.profiles
FOR SELECT
USING (has_table_permission(auth.uid(), 'usuarios', 'view'));

-- Allow users with "usuarios" view permission to see all user_roles
CREATE POLICY "Users with usuarios permission can view all roles"
ON public.user_roles
FOR SELECT
USING (has_table_permission(auth.uid(), 'usuarios', 'view'));
