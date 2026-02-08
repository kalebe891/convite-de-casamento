
-- Allow users with "usuarios" view permission to see all role permissions
CREATE POLICY "Users with usuarios permission can view all permissions"
ON public.admin_permissions
FOR SELECT
USING (
  has_table_permission(auth.uid(), 'usuarios'::text, 'view'::text)
);
