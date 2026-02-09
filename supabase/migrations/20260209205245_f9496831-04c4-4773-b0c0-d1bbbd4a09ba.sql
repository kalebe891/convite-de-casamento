
-- RPC atômica para seleção de presentes com proteção contra concorrência
CREATE OR REPLACE FUNCTION public.claim_gift(
  p_gift_id UUID,
  p_guest_id UUID
)
RETURNS TABLE(success BOOLEAN, gift_name TEXT, error_code TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gift_name TEXT;
  v_existing_gift TEXT;
BEGIN
  -- 1. Verificar se guest já tem presente selecionado
  SELECT gi.gift_name INTO v_existing_gift
  FROM gift_items gi
  WHERE gi.selected_by_guest_id = p_guest_id
  LIMIT 1;

  IF v_existing_gift IS NOT NULL THEN
    RETURN QUERY SELECT false, v_existing_gift, 'ALREADY_HAS_GIFT'::TEXT;
    RETURN;
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
$$;

-- RPC para desmarcar presente de um guest
CREATE OR REPLACE FUNCTION public.unclaim_gift(
  p_guest_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE gift_items
  SET selected_by_guest_id = NULL
  WHERE selected_by_guest_id = p_guest_id;
  
  RETURN true;
END;
$$;

-- Atualizar RLS policy para usar selected_by_guest_id
DROP POLICY IF EXISTS "Guests can select gifts only once per token" ON gift_items;

CREATE POLICY "Guests can select available gifts"
ON gift_items
FOR UPDATE
USING (selected_by_guest_id IS NULL)
WITH CHECK (selected_by_guest_id IS NOT NULL);
