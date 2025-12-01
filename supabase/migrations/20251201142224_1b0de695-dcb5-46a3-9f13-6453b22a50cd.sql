-- Allow users with appropriate permissions to view all logs (not just their own)
DROP POLICY IF EXISTS "Authorized users can view their own logs" ON public.admin_logs;

CREATE POLICY "Authorized users can view logs based on permissions"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::text) 
  OR has_table_permission(auth.uid(), 'logs'::text, 'view'::text)
);