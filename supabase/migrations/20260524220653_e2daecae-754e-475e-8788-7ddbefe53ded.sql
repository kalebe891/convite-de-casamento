
ALTER TABLE public.gift_items
  DROP CONSTRAINT IF EXISTS gift_items_wedding_id_fkey;

ALTER TABLE public.gift_items
  ADD CONSTRAINT gift_items_wedding_id_fkey
  FOREIGN KEY (wedding_id)
  REFERENCES public.wedding_details(id)
  ON DELETE CASCADE;
