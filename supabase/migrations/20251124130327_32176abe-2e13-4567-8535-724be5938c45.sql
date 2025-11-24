-- Adicionar política RLS para permitir SELECT público na tabela pending_users
-- Apenas via token válido (não usado e não expirado)
CREATE POLICY "Permitir leitura pública via token válido"
ON public.pending_users
FOR SELECT
TO anon, authenticated
USING (
  token IS NOT NULL 
  AND usado = false 
  AND expires_at > NOW()
);