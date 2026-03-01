
-- Add deleted_by column to invitations
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS deleted_by text;
