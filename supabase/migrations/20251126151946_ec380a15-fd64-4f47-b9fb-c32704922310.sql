-- Add column to track which invitation/guest selected each gift
ALTER TABLE public.gift_items 
ADD COLUMN selected_by_invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_gift_items_selected_by ON public.gift_items(selected_by_invitation_id);

-- Update RLS policies to allow guests to select gifts
CREATE POLICY "Guests can update gifts to select them"
ON public.gift_items
FOR UPDATE
USING (
  selected_by_invitation_id IS NULL 
  AND is_public = true
)
WITH CHECK (
  selected_by_invitation_id IS NOT NULL
);