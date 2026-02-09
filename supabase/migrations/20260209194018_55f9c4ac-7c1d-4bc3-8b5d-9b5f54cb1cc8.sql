
-- Add archived_at column for soft delete
ALTER TABLE public.guests
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE NULL;

-- Index for filtering active guests efficiently
CREATE INDEX idx_guests_archived_at ON public.guests(archived_at)
WHERE archived_at IS NULL;

-- Prevent creating invitations for archived guests
CREATE OR REPLACE FUNCTION public.prevent_invitation_for_archived_guest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.guests
    WHERE id = NEW.guest_id AND archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot create invitation for archived guest';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_guest_not_archived_on_invitation
BEFORE INSERT ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invitation_for_archived_guest();

-- Prevent linking gifts to archived guests (via invitation with archived guest)
CREATE OR REPLACE FUNCTION public.prevent_gift_for_archived_guest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.selected_by_invitation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.invitations i
    JOIN public.guests g ON g.id = i.guest_id
    WHERE i.id = NEW.selected_by_invitation_id AND g.archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot link gift to archived guest';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_guest_not_archived_on_gift
BEFORE INSERT OR UPDATE ON public.gift_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_gift_for_archived_guest();
