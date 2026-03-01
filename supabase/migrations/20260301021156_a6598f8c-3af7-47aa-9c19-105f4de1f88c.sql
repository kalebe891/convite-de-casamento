
-- 1. Add deleted_at to invitations table
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Soft-delete duplicate invitations (keep only the most recent per guest+wedding)
UPDATE public.invitations SET deleted_at = now()
WHERE id NOT IN (
  SELECT DISTINCT ON (guest_id, wedding_id) id
  FROM public.invitations
  WHERE deleted_at IS NULL
  ORDER BY guest_id, wedding_id, created_at DESC
);

-- 3. Drop full unique constraints on invitations
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_unique_code_key;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_invitation_code_key;
DROP INDEX IF EXISTS idx_invitations_unique_code;

-- 4. Create partial unique indexes for invitations (only active records)
CREATE UNIQUE INDEX idx_invitations_unique_code_active ON public.invitations (unique_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_invitations_invitation_code_active ON public.invitations (invitation_code) WHERE deleted_at IS NULL AND invitation_code IS NOT NULL;
CREATE UNIQUE INDEX idx_invitations_guest_wedding_active ON public.invitations (guest_id, wedding_id) WHERE deleted_at IS NULL;

-- 5. Drop full unique constraints on guests
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_phone_key;
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_email_unique;

-- 6. Create partial unique indexes for guests (only active records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_unique_active_email ON public.guests (email) WHERE archived_at IS NULL AND email IS NOT NULL;

-- 7. Index for filtering deleted invitations
CREATE INDEX idx_invitations_deleted_at ON public.invitations (deleted_at) WHERE deleted_at IS NULL;
