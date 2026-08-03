-- Etapa 1.26.06 — Migração das policies do módulo Convites
-- Tenant path: invitations.wedding_id, rsvp_tokens.wedding_id, rsvps.wedding_id (colunas reais confirmadas no schema)

-- ============ invitations ============
DROP POLICY IF EXISTS "Users can manage invitations of their weddings" ON public.invitations;

CREATE POLICY "Users can view invitations of their weddings"
ON public.invitations
AS PERMISSIVE
FOR SELECT
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'view'));

CREATE POLICY "Users can insert invitations of their weddings"
ON public.invitations
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'add'));

CREATE POLICY "Users can update invitations of their weddings"
ON public.invitations
AS PERMISSIVE
FOR UPDATE
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'edit'));

CREATE POLICY "Users can delete invitations of their weddings"
ON public.invitations
AS PERMISSIVE
FOR DELETE
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'delete'));

-- ============ rsvp_tokens ============
-- Policy pública "Anyone can read valid tokens" NÃO é alterada.
DROP POLICY IF EXISTS "Authorized users can manage tokens of their weddings" ON public.rsvp_tokens;

CREATE POLICY "Authorized users can view tokens of their weddings"
ON public.rsvp_tokens
AS PERMISSIVE
FOR SELECT
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'view'));

CREATE POLICY "Authorized users can insert tokens of their weddings"
ON public.rsvp_tokens
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'add'));

CREATE POLICY "Authorized users can update tokens of their weddings"
ON public.rsvp_tokens
AS PERMISSIVE
FOR UPDATE
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'edit'));

CREATE POLICY "Authorized users can delete tokens of their weddings"
ON public.rsvp_tokens
AS PERMISSIVE
FOR DELETE
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'delete'));

-- ============ rsvps ============
-- Policy "Service role can insert RSVPs" (WITH CHECK false) NÃO é alterada.
DROP POLICY IF EXISTS "Users can view RSVPs of their weddings" ON public.rsvps;

CREATE POLICY "Users can view RSVPs of their weddings"
ON public.rsvps
AS PERMISSIVE
FOR SELECT
TO public
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convites', 'view'));
