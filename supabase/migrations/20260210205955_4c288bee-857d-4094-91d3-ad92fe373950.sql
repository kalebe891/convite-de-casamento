
-- ═══════════════════════════════════════════════════════════════
-- BULLETPROOF: gift_items + claim_gift hardening
-- ═══════════════════════════════════════════════════════════════

-- 1. Novas colunas
ALTER TABLE gift_items ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE gift_items ADD COLUMN IF NOT EXISTS claimed_via_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill claimed_at para registros existentes
UPDATE gift_items
SET claimed_at = NOW()
WHERE selected_by_guest_id IS NOT NULL AND claimed_at IS NULL;

-- 3. CHECK constraint de consistência guest ↔ timestamp
ALTER TABLE gift_items
ADD CONSTRAINT gift_claim_consistency
CHECK (
    (selected_by_guest_id IS NULL AND claimed_at IS NULL)
    OR
    (selected_by_guest_id IS NOT NULL AND claimed_at IS NOT NULL)
);

-- 4. Dropar índice antigo e criar UNIQUE parcial correto (admin bypass)
DROP INDEX IF EXISTS idx_gift_items_unique_guest;
DROP INDEX IF EXISTS idx_gift_items_selected_by_guest_id;

CREATE UNIQUE INDEX uniq_guest_single_gift
ON gift_items(selected_by_guest_id)
WHERE selected_by_guest_id IS NOT NULL AND claimed_via_admin = false;

-- 5. Índice para claims ativos (dashboards, joins)
CREATE INDEX idx_gift_items_active_claims
ON gift_items(selected_by_guest_id)
WHERE selected_by_guest_id IS NOT NULL;

-- 6. Remover RLS policy que permite UPDATE direto por guests
DROP POLICY IF EXISTS "Guests can select available gifts" ON gift_items;

-- 7. Reescrever claim_gift com claimed_at, claimed_via_admin, captura de 23505
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
  v_existing_gift_name TEXT;
BEGIN
  -- 0. IDEMPOTÊNCIA: guest já possui ESTE presente → sucesso sem escrita
  SELECT gi.gift_name INTO v_gift_name
  FROM gift_items gi
  WHERE gi.id = p_gift_id
    AND gi.selected_by_guest_id = p_guest_id;

  IF v_gift_name IS NOT NULL THEN
    RETURN QUERY SELECT true, v_gift_name, NULL::TEXT;
    RETURN;
  END IF;

  -- 1. Verificar se guest já tem presente (skip se admin)
  IF NOT p_allow_multiple THEN
    SELECT gi.gift_name INTO v_existing_gift_name
    FROM gift_items gi
    WHERE gi.selected_by_guest_id = p_guest_id
    LIMIT 1;

    IF v_existing_gift_name IS NOT NULL THEN
      RETURN QUERY SELECT false, v_existing_gift_name, 'ALREADY_HAS_GIFT'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 2. Reserva atômica com claimed_at e claimed_via_admin
  BEGIN
    UPDATE gift_items
    SET selected_by_guest_id = p_guest_id,
        claimed_at = NOW(),
        claimed_via_admin = p_allow_multiple
    WHERE id = p_gift_id
      AND selected_by_guest_id IS NULL
    RETURNING gift_items.gift_name INTO v_gift_name;
  EXCEPTION
    WHEN unique_violation THEN
      -- Índice uniq_guest_single_gift impediu: guest já tem presente
      SELECT gi.gift_name INTO v_existing_gift_name
      FROM gift_items gi
      WHERE gi.selected_by_guest_id = p_guest_id
        AND gi.claimed_via_admin = false
      LIMIT 1;
      RETURN QUERY SELECT false, COALESCE(v_existing_gift_name, 'desconhecido'), 'ALREADY_HAS_GIFT'::TEXT;
      RETURN;
  END;

  -- 3. Nenhuma linha afetada = presente já ocupado
  IF v_gift_name IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'GIFT_UNAVAILABLE'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_gift_name, NULL::TEXT;
END;
$function$;

-- 8. Atualizar unclaim_gift para limpar novas colunas
CREATE OR REPLACE FUNCTION public.unclaim_gift(p_guest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE gift_items
  SET selected_by_guest_id = NULL,
      claimed_at = NULL,
      claimed_via_admin = false
  WHERE selected_by_guest_id = p_guest_id;
  RETURN true;
END;
$function$;
