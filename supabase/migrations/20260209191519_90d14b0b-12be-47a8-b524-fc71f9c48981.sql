
-- Add guest_id column to invitations
ALTER TABLE public.invitations
ADD COLUMN guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_invitations_guest_id ON public.invitations(guest_id);

-- Populate guest_id for existing records using phone match (primary identifier)
UPDATE public.invitations i
SET guest_id = g.id
FROM public.guests g
WHERE i.guest_phone IS NOT NULL
  AND g.phone = i.guest_phone
  AND i.guest_id IS NULL;

-- Secondary pass: match by email for records still without guest_id
UPDATE public.invitations i
SET guest_id = g.id
FROM public.guests g
WHERE i.guest_id IS NULL
  AND i.guest_email IS NOT NULL
  AND g.email IS NOT NULL
  AND g.email = i.guest_email;
