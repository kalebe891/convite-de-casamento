
-- Passo 1: Adicionar coluna guest_id em gift_items
ALTER TABLE public.gift_items
ADD COLUMN selected_by_guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_gift_items_selected_by_guest_id ON public.gift_items (selected_by_guest_id);

-- Passo 2: Migrar dados existentes usando o relacionamento invitation -> guest
UPDATE public.gift_items gi
SET selected_by_guest_id = inv.guest_id
FROM public.invitations inv
WHERE gi.selected_by_invitation_id = inv.id
  AND inv.guest_id IS NOT NULL;

-- Passo 3: Atualizar trigger de proteção para usar guest_id
CREATE OR REPLACE FUNCTION public.prevent_gift_for_archived_guest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selected_by_guest_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.guests
    WHERE id = NEW.selected_by_guest_id AND archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot link gift to archived guest';
  END IF;
  RETURN NEW;
END;
$function$;
