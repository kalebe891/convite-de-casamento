DROP POLICY IF EXISTS "Anyone can view gift items" ON public.gift_items;

CREATE POLICY "Anyone can view public gift items"
ON public.gift_items
FOR SELECT
USING (is_public = true);