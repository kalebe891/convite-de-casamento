-- Drop existing admin_permissions table and recreate with role-based structure
DROP TABLE IF EXISTS public.admin_permissions CASCADE;

-- Create admin_permissions table with role_key instead of user_id
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  menu_key TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_add BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_key, menu_key)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all permissions
CREATE POLICY "Admins can manage all permissions"
  ON public.admin_permissions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Users can view their own role permissions
CREATE POLICY "Users can view their role permissions"
  ON public.admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    role_key IN (
      SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();