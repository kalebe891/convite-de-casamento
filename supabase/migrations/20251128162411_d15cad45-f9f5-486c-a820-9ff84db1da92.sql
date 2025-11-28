-- Create role_profiles table for custom role management
CREATE TABLE IF NOT EXISTS public.role_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  role_label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view roles
CREATE POLICY "Anyone can view role profiles"
  ON public.role_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage role profiles"
  ON public.role_profiles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_role_profiles_updated_at
  BEFORE UPDATE ON public.role_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system roles
INSERT INTO public.role_profiles (role_key, role_label, is_system) VALUES
  ('admin', 'Administrador', true),
  ('couple', 'Casal', true),
  ('planner', 'Cerimonialista', true),
  ('cerimonial', 'Cerimonial', true)
ON CONFLICT (role_key) DO NOTHING;