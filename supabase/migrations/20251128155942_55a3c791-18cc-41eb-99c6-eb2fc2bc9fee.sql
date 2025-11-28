-- Criar tabela de permissões administrativas
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_add boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, menu_key)
);

-- Habilitar RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policy para admins gerenciarem todas as permissões
CREATE POLICY "Admins can manage all permissions"
ON public.admin_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy para usuários visualizarem suas próprias permissões
CREATE POLICY "Users can view their own permissions"
ON public.admin_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();