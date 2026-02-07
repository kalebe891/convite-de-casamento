
-- Permitir que usuários com permissão de visualização no menu 'checkin' possam ver os convidados
CREATE POLICY "Users with checkin permission can view guests"
ON public.guests
FOR SELECT
USING (has_table_permission(auth.uid(), 'checkin'::text, 'view'::text));

-- Permitir que usuários com permissão de edição no menu 'checkin' possam atualizar convidados (para registrar check-in)
CREATE POLICY "Users with checkin permission can update guests"
ON public.guests
FOR UPDATE
USING (has_table_permission(auth.uid(), 'checkin'::text, 'edit'::text));
