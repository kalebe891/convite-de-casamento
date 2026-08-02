-- wedding_details: UPDATE (menu_key = 'detalhes', permissão 'edit')
DROP POLICY IF EXISTS "Users can update their wedding details" ON public.wedding_details;
CREATE POLICY "Users can update their wedding details"
ON public.wedding_details
FOR UPDATE
USING (public.has_table_permission_for_wedding(auth.uid(), id, 'detalhes', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), id, 'detalhes', 'edit'));

-- events: substituir policy ALL legada por policies por operação (menu_key = 'eventos')
DROP POLICY IF EXISTS "Users can manage events of their weddings" ON public.events;

CREATE POLICY "Users can view events of their weddings"
ON public.events
FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'eventos', 'view'));

CREATE POLICY "Users can insert events of their weddings"
ON public.events
FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'eventos', 'add'));

CREATE POLICY "Users can update events of their weddings"
ON public.events
FOR UPDATE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'eventos', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'eventos', 'edit'));

CREATE POLICY "Users can delete events of their weddings"
ON public.events
FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'eventos', 'delete'));