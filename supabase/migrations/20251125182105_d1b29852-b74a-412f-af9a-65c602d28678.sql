-- Criar tabela de logs administrativos
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_admin_logs_user_id ON public.admin_logs(user_id);
CREATE INDEX idx_admin_logs_table_name ON public.admin_logs(table_name);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver todos os logs
CREATE POLICY "Admins can view all logs"
  ON public.admin_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Usuários autorizados podem ver seus próprios logs (exceto logs de user_roles)
CREATE POLICY "Authorized users can view their own logs"
  ON public.admin_logs
  FOR SELECT
  USING (
    (has_role(auth.uid(), 'couple'::app_role) OR 
     has_role(auth.uid(), 'planner'::app_role) OR 
     has_role(auth.uid(), 'cerimonial'::app_role))
    AND user_id = auth.uid()
    AND table_name != 'user_roles'
  );

-- Policy: Sistema pode inserir logs (service role)
CREATE POLICY "Service role can insert logs"
  ON public.admin_logs
  FOR INSERT
  WITH CHECK (true);