
-- Atualizar claim_gift com parâmetro allow_multiple
CREATE OR REPLACE FUNCTION public.claim_gift(p_gift_id uuid, p_guest_id uuid, p_allow_multiple boolean DEFAULT false)
 RETURNS TABLE(success boolean, gift_name text, error_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gift_name TEXT;
  v_existing_gift TEXT;
BEGIN
  -- 1. Verificar se guest já tem presente selecionado (skip se admin override)
  IF NOT p_allow_multiple THEN
    SELECT gi.gift_name INTO v_existing_gift
    FROM gift_items gi
    WHERE gi.selected_by_guest_id = p_guest_id
    LIMIT 1;

    IF v_existing_gift IS NOT NULL THEN
      RETURN QUERY SELECT false, v_existing_gift, 'ALREADY_HAS_GIFT'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 2. Tentar reservar atomicamente (UPDATE condicional com RETURNING)
  UPDATE gift_items
  SET selected_by_guest_id = p_guest_id
  WHERE id = p_gift_id
    AND selected_by_guest_id IS NULL
  RETURNING gift_items.gift_name INTO v_gift_name;

  -- 3. Se nenhuma linha afetada = presente já selecionado por outro
  IF v_gift_name IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'GIFT_UNAVAILABLE'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_gift_name, NULL::TEXT;
END;
$function$;
