
-- ═══════════════════════════════════════════════════════════════
-- HARDENING: claim_gift RPC + proteção estrutural
-- ═══════════════════════════════════════════════════════════════

-- 1. PARTIAL UNIQUE INDEX: impede fisicamente que 1 guest tenha 2+ presentes
--    Isso é a proteção DEFINITIVA - mesmo UPDATE direto não burla.
DROP INDEX IF EXISTS idx_gift_items_selected_by_guest_id;
CREATE UNIQUE INDEX idx_gift_items_unique_guest 
  ON gift_items (selected_by_guest_id) 
  WHERE selected_by_guest_id IS NOT NULL;

-- 2. Reescrever claim_gift: idempotente + race-condition-proof
CREATE OR REPLACE FUNCTION public.claim_gift(
  p_gift_id uuid, 
  p_guest_id uuid, 
  p_allow_multiple boolean DEFAULT false
)
RETURNS TABLE(success boolean, gift_name text, error_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gift_name TEXT;
  v_existing_gift_id UUID;
  v_existing_gift_name TEXT;
BEGIN
  -- 0. IDEMPOTÊNCIA: se o guest já possui ESTE presente, retornar sucesso
  SELECT gi.gift_name INTO v_gift_name
  FROM gift_items gi
  WHERE gi.id = p_gift_id
    AND gi.selected_by_guest_id = p_guest_id;

  IF v_gift_name IS NOT NULL THEN
    RETURN QUERY SELECT true, v_gift_name, NULL::TEXT;
    RETURN;
  END IF;

  -- 1. Verificar se guest já tem outro presente (skip se admin override)
  IF NOT p_allow_multiple THEN
    SELECT gi.id, gi.gift_name INTO v_existing_gift_id, v_existing_gift_name
    FROM gift_items gi
    WHERE gi.selected_by_guest_id = p_guest_id
    LIMIT 1;

    IF v_existing_gift_id IS NOT NULL THEN
      RETURN QUERY SELECT false, v_existing_gift_name, 'ALREADY_HAS_GIFT'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 2. Reserva atômica: UPDATE condicional com RETURNING
  --    PostgreSQL garante que apenas 1 transação vence este UPDATE.
  --    Row-level lock é adquirido automaticamente pelo UPDATE.
  UPDATE gift_items
  SET selected_by_guest_id = p_guest_id
  WHERE id = p_gift_id
    AND selected_by_guest_id IS NULL
  RETURNING gift_items.gift_name INTO v_gift_name;

  -- 3. Se nenhuma linha afetada = presente já ocupado
  IF v_gift_name IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'GIFT_UNAVAILABLE'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_gift_name, NULL::TEXT;
END;
$function$;
