-- 1. Tornar email único e obrigatório na tabela guests
ALTER TABLE public.guests 
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT guests_email_unique UNIQUE (email);

-- 2. Criar função e trigger para sincronizar status entre invitations e guests
CREATE OR REPLACE FUNCTION sync_invitation_with_guest()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma invitation é respondida, atualizar o guest correspondente
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    UPDATE public.guests
    SET status = CASE
      WHEN NEW.attending = true THEN 'confirmed'
      WHEN NEW.attending = false THEN 'declined'
      ELSE 'pending'
    END
    WHERE email = NEW.guest_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_invitation_responded
  AFTER UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION sync_invitation_with_guest();

-- 3. Criar função e trigger para sincronizar status entre rsvps e guests  
CREATE OR REPLACE FUNCTION sync_rsvp_with_guest()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um RSVP é criado, atualizar o guest correspondente
  UPDATE public.guests
  SET status = CASE
    WHEN NEW.attending = true THEN 'confirmed'
    WHEN NEW.attending = false THEN 'declined'
    ELSE 'pending'
  END
  WHERE email = NEW.guest_email AND email IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_rsvp_created
  AFTER INSERT ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION sync_rsvp_with_guest();