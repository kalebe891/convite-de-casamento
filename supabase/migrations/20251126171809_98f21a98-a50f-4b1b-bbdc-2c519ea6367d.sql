-- Corrigir trigger de sincronização para usar phone e email
-- Primeiro remover todos os triggers que dependem da função
DROP TRIGGER IF EXISTS on_invitation_responded ON public.invitations;
DROP TRIGGER IF EXISTS sync_invitation_response ON public.invitations;

-- Agora pode dropar a função
DROP FUNCTION IF EXISTS public.sync_invitation_with_guest();

-- Recriar a função corrigida
CREATE OR REPLACE FUNCTION public.sync_invitation_with_guest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando uma invitation é respondida, atualizar o guest correspondente
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    -- Tentar encontrar por email primeiro (se existir)
    IF NEW.guest_email IS NOT NULL THEN
      UPDATE public.guests
      SET status = CASE
        WHEN NEW.attending = true THEN 'confirmed'
        WHEN NEW.attending = false THEN 'declined'
        ELSE 'pending'
      END
      WHERE email = NEW.guest_email;
    END IF;
    
    -- Se não encontrou por email, tentar por telefone
    IF NOT FOUND AND NEW.guest_phone IS NOT NULL THEN
      UPDATE public.guests
      SET status = CASE
        WHEN NEW.attending = true THEN 'confirmed'
        WHEN NEW.attending = false THEN 'declined'
        ELSE 'pending'
      END
      WHERE phone = NEW.guest_phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger com o nome correto
CREATE TRIGGER on_invitation_responded
AFTER UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.sync_invitation_with_guest();