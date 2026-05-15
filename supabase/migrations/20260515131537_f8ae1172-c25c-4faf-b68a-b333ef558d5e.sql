
-- =========================================================================
-- FASE 11 — Multi-tenant RLS por wedding_id
-- =========================================================================

-- Parte 2: helper combinando permissão de menu + acesso ao evento
CREATE OR REPLACE FUNCTION public.has_table_permission_for_wedding(
  _user_id uuid,
  _wedding_id uuid,
  _menu_key text,
  _permission_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _wedding_id IS NOT NULL
    AND public.has_table_permission(_user_id, _menu_key, _permission_type)
    AND public.user_has_wedding_access(_user_id, _wedding_id);
$$;

-- =========================================================================
-- Parte 3: guests
-- =========================================================================
DROP POLICY IF EXISTS "Users with permissions can view guests"   ON public.guests;
DROP POLICY IF EXISTS "Users with permissions can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Users with permissions can update guests" ON public.guests;
DROP POLICY IF EXISTS "Users with permissions can delete guests" ON public.guests;
DROP POLICY IF EXISTS "Users with checkin permission can view guests"   ON public.guests;
DROP POLICY IF EXISTS "Users with checkin permission can update guests" ON public.guests;

CREATE POLICY "Users can view guests of their weddings"
ON public.guests FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convidados', 'view'));

CREATE POLICY "Users can insert guests to their weddings"
ON public.guests FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convidados', 'add'));

CREATE POLICY "Users can update guests of their weddings"
ON public.guests FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convidados', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convidados', 'edit'));

CREATE POLICY "Users can delete guests of their weddings"
ON public.guests FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'convidados', 'delete'));

-- Checkin role (escopo do evento)
CREATE POLICY "Checkin users can view guests of their weddings"
ON public.guests FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'checkin', 'view'));

CREATE POLICY "Checkin users can update guests of their weddings"
ON public.guests FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'checkin', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'checkin', 'edit'));

-- =========================================================================
-- Parte 4: gift_items (menu: presentes)
-- =========================================================================
DROP POLICY IF EXISTS "Users with permissions can view gift_items"   ON public.gift_items;
DROP POLICY IF EXISTS "Users with permissions can insert gift_items" ON public.gift_items;
DROP POLICY IF EXISTS "Users with permissions can update gift_items" ON public.gift_items;
DROP POLICY IF EXISTS "Users with permissions can delete gift_items" ON public.gift_items;
-- "Anyone can view gift items" mantida (leitura pública total — não há filtro is_public para presentes na regra atual)

CREATE POLICY "Users can view gift_items of their weddings"
ON public.gift_items FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'presentes', 'view'));

CREATE POLICY "Users can insert gift_items to their weddings"
ON public.gift_items FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'presentes', 'add'));

CREATE POLICY "Users can update gift_items of their weddings"
ON public.gift_items FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'presentes', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'presentes', 'edit'));

CREATE POLICY "Users can delete gift_items of their weddings"
ON public.gift_items FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'presentes', 'delete'));

-- =========================================================================
-- Parte 4: timeline_events (menu: cronograma)
-- =========================================================================
DROP POLICY IF EXISTS "Users with permissions can view timeline_events"   ON public.timeline_events;
DROP POLICY IF EXISTS "Users with permissions can insert timeline_events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users with permissions can update timeline_events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users with permissions can delete timeline_events" ON public.timeline_events;
-- "Anyone can view public timeline events" mantida (is_public = true)

CREATE POLICY "Users can view timeline_events of their weddings"
ON public.timeline_events FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'cronograma', 'view'));

CREATE POLICY "Users can insert timeline_events to their weddings"
ON public.timeline_events FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'cronograma', 'add'));

CREATE POLICY "Users can update timeline_events of their weddings"
ON public.timeline_events FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'cronograma', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'cronograma', 'edit'));

CREATE POLICY "Users can delete timeline_events of their weddings"
ON public.timeline_events FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'cronograma', 'delete'));

-- =========================================================================
-- Parte 4: buffet_items (menu: buffet)
-- =========================================================================
DROP POLICY IF EXISTS "Users with permissions can view buffet_items"   ON public.buffet_items;
DROP POLICY IF EXISTS "Users with permissions can insert buffet_items" ON public.buffet_items;
DROP POLICY IF EXISTS "Users with permissions can update buffet_items" ON public.buffet_items;
DROP POLICY IF EXISTS "Users with permissions can delete buffet_items" ON public.buffet_items;
-- "Anyone can view public buffet items" mantida (is_public = true)

CREATE POLICY "Users can view buffet_items of their weddings"
ON public.buffet_items FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'buffet', 'view'));

CREATE POLICY "Users can insert buffet_items to their weddings"
ON public.buffet_items FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'buffet', 'add'));

CREATE POLICY "Users can update buffet_items of their weddings"
ON public.buffet_items FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'buffet', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'buffet', 'edit'));

CREATE POLICY "Users can delete buffet_items of their weddings"
ON public.buffet_items FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'buffet', 'delete'));

-- =========================================================================
-- Parte 4: playlist_songs (menu: playlist)
-- =========================================================================
DROP POLICY IF EXISTS "Users with permissions can view playlist_songs"   ON public.playlist_songs;
DROP POLICY IF EXISTS "Users with permissions can insert playlist_songs" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users with permissions can update playlist_songs" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users with permissions can delete playlist_songs" ON public.playlist_songs;
-- "Anyone can view public playlist songs" mantida (is_public = true)

CREATE POLICY "Users can view playlist_songs of their weddings"
ON public.playlist_songs FOR SELECT
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'playlist', 'view'));

CREATE POLICY "Users can insert playlist_songs to their weddings"
ON public.playlist_songs FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'playlist', 'add'));

CREATE POLICY "Users can update playlist_songs of their weddings"
ON public.playlist_songs FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'playlist', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'playlist', 'edit'));

CREATE POLICY "Users can delete playlist_songs of their weddings"
ON public.playlist_songs FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'playlist', 'delete'));

-- =========================================================================
-- Parte 4: photos (menu: momentos)  — sem coluna is_public; leitura pública mantida
-- =========================================================================
DROP POLICY IF EXISTS "Users with permissions can view photos"   ON public.photos;
DROP POLICY IF EXISTS "Users with permissions can insert photos" ON public.photos;
DROP POLICY IF EXISTS "Users with permissions can update photos" ON public.photos;
DROP POLICY IF EXISTS "Users with permissions can delete photos" ON public.photos;
-- "Anyone can view photos" mantida (página pública precisa)

CREATE POLICY "Users can insert photos to their weddings"
ON public.photos FOR INSERT
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'momentos', 'add'));

CREATE POLICY "Users can update photos of their weddings"
ON public.photos FOR UPDATE
USING      (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'momentos', 'edit'))
WITH CHECK (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'momentos', 'edit'));

CREATE POLICY "Users can delete photos of their weddings"
ON public.photos FOR DELETE
USING (public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'momentos', 'delete'));

-- =========================================================================
-- Parte 5: events
-- =========================================================================
DROP POLICY IF EXISTS "Authorized users can manage events" ON public.events;
-- "Anyone can view events" mantida

CREATE POLICY "Users can manage events of their weddings"
ON public.events FOR ALL
USING (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
)
WITH CHECK (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
);

-- =========================================================================
-- Parte 6: invitations
-- =========================================================================
DROP POLICY IF EXISTS "Authorized users can manage invitations" ON public.invitations;

CREATE POLICY "Users can manage invitations of their weddings"
ON public.invitations FOR ALL
USING (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
)
WITH CHECK (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
);

-- =========================================================================
-- Parte 7: rsvps
-- =========================================================================
DROP POLICY IF EXISTS "Authorized users can view RSVPs" ON public.rsvps;
-- "Service role can insert RSVPs" mantida (with check false; inserts via service_role bypassam RLS)

CREATE POLICY "Users can view RSVPs of their weddings"
ON public.rsvps FOR SELECT
USING (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
);

-- =========================================================================
-- Parte 8: rsvp_tokens
-- =========================================================================
DROP POLICY IF EXISTS "Admins can manage tokens" ON public.rsvp_tokens;
-- "Anyone can read valid tokens" mantida (fluxo público de RSVP por token)

CREATE POLICY "Authorized users can manage tokens of their weddings"
ON public.rsvp_tokens FOR ALL
USING (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
)
WITH CHECK (
  public.user_has_wedding_access(auth.uid(), wedding_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
);

-- =========================================================================
-- Parte 9: checkin_logs
-- =========================================================================
DROP POLICY IF EXISTS "Authorized users can view checkin logs" ON public.checkin_logs;
-- "Admins can delete checkin logs" mantida (operação raríssima de superadmin)

CREATE POLICY "Users can view checkin logs of their weddings"
ON public.checkin_logs FOR SELECT
USING (
  wedding_id IS NOT NULL
  AND public.user_has_wedding_access(auth.uid(), wedding_id)
);

-- =========================================================================
-- Parte 9: admin_logs
-- Decisão: super-admins (role 'admin') continuam vendo TODOS os logs, inclusive
-- registros legados com wedding_id NULL. Demais roles veem somente logs do
-- wedding ao qual estão vinculados E que tenham permissão de view em 'logs'.
-- =========================================================================
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Authorized users can view logs based on permissions" ON public.admin_logs;
-- "Service role can insert logs" mantida

CREATE POLICY "Admins can view all admin logs"
ON public.admin_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view admin logs of their weddings"
ON public.admin_logs FOR SELECT
USING (
  wedding_id IS NOT NULL
  AND public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'logs', 'view')
);

-- =========================================================================
-- Parte 10: pending_users
-- Convites globais (wedding_id NULL) só admin gerencia.
-- =========================================================================
DROP POLICY IF EXISTS "Admins can manage pending users" ON public.pending_users;
-- "Public can read valid tokens", "Service role can manage pending users",
-- "Service role can delete pending users" mantidas

CREATE POLICY "Admins can manage all pending users"
ON public.pending_users FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Wedding members can manage pending users of their weddings"
ON public.pending_users FOR ALL
USING (
  wedding_id IS NOT NULL
  AND public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'usuarios', 'view')
)
WITH CHECK (
  wedding_id IS NOT NULL
  AND public.has_table_permission_for_wedding(auth.uid(), wedding_id, 'usuarios', 'add')
);

-- =========================================================================
-- Parte 11: wedding_details
-- SELECT público mantido (página pública por slug). Restringe UPDATE/DELETE/INSERT.
-- =========================================================================
DROP POLICY IF EXISTS "Admins and couples can manage wedding details" ON public.wedding_details;
-- "Anyone can view wedding details" mantida

CREATE POLICY "Users can update their wedding details"
ON public.wedding_details FOR UPDATE
USING (
  public.user_has_wedding_access(auth.uid(), id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
)
WITH CHECK (
  public.user_has_wedding_access(auth.uid(), id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'couple')
    OR public.has_role(auth.uid(), 'planner')
  )
);

CREATE POLICY "Admins can insert wedding details"
ON public.wedding_details FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wedding details"
ON public.wedding_details FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
