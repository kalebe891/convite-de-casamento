-- Remove políticas públicas inseguras da tabela invitations
DROP POLICY IF EXISTS "Anyone can update their own invitation" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations with unique code" ON public.invitations;

-- Mantém apenas a policy para usuários autorizados
-- A policy "Authorized users can manage invitations" já existe e está correta