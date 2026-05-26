
CREATE POLICY "Tenant managers can view wedding links"
ON public.user_weddings
FOR SELECT
TO authenticated
USING (
  public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'usuarios', 'view')
);

CREATE POLICY "Tenant managers can update wedding roles"
ON public.user_weddings
FOR UPDATE
TO authenticated
USING (
  public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'usuarios', 'edit')
  AND role <> 'admin'
)
WITH CHECK (
  public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'usuarios', 'edit')
  AND role <> 'admin'
);
