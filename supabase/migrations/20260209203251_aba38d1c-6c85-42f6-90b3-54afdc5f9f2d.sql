
-- 1. Índice UNIQUE parcial para evitar duplicidade de telefone entre guests ativos
CREATE UNIQUE INDEX idx_guests_unique_active_phone 
ON public.guests (phone) 
WHERE archived_at IS NULL;

-- 2. Função de limpeza automática de guests arquivados há mais de 12 meses
CREATE OR REPLACE FUNCTION public.cleanup_archived_guests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Primeiro, limpar referências em invitations de guests arquivados há mais de 12 meses
  -- Os gifts já possuem ON DELETE SET NULL via invitation_id
  DELETE FROM public.invitations
  WHERE guest_id IN (
    SELECT id FROM public.guests
    WHERE archived_at IS NOT NULL
      AND archived_at < NOW() - INTERVAL '12 months'
  );

  -- Limpar rsvp_tokens de guests arquivados há mais de 12 meses
  DELETE FROM public.rsvp_tokens
  WHERE guest_id IN (
    SELECT id FROM public.guests
    WHERE archived_at IS NOT NULL
      AND archived_at < NOW() - INTERVAL '12 months'
  );

  -- Agora deletar os guests arquivados
  DELETE FROM public.guests
  WHERE archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '12 months';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3. Extensão pg_cron para agendamento (se disponível)
-- Nota: pg_cron pode não estar disponível em todos os ambientes.
-- Se não estiver, a função pode ser chamada manualmente ou via edge function.
-- SELECT cron.schedule('cleanup-archived-guests', '0 3 1 * *', 'SELECT public.cleanup_archived_guests()');
