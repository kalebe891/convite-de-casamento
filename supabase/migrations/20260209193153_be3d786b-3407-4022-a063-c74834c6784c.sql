
-- Make guest_id NOT NULL (all 29 records already have valid values)
ALTER TABLE public.invitations
ALTER COLUMN guest_id SET NOT NULL;

-- Replace existing FK to add ON DELETE CASCADE
ALTER TABLE public.invitations
DROP CONSTRAINT IF EXISTS invitations_guest_id_fkey;

ALTER TABLE public.invitations
ADD CONSTRAINT invitations_guest_id_fkey
FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;
