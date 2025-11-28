-- Passo 1: Remover políticas que dependem da coluna role
DROP POLICY IF EXISTS "Users can view their role permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.admin_permissions;

-- Passo 2: Alterar a coluna role de enum para text
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE text USING role::text;

-- Passo 3: Adicionar foreign key para role_profiles
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_role_fkey 
  FOREIGN KEY (role) 
  REFERENCES public.role_profiles(role_key) 
  ON DELETE RESTRICT;

-- Passo 4: Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Passo 5: Recriar as políticas RLS
CREATE POLICY "Users can view their role permissions" 
ON public.admin_permissions 
FOR SELECT 
TO authenticated
USING (
  role_key IN (
    SELECT role::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all permissions" 
ON public.admin_permissions 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));