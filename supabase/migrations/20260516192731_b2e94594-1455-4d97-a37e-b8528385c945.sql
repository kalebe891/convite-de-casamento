DO $$
DECLARE
  twid uuid := '5e1b7fd6-556b-4365-9c6e-e9cfc1831b0e';
BEGIN
  DELETE FROM public.photos WHERE wedding_id = twid;
  DELETE FROM public.playlist_songs WHERE wedding_id = twid;
  DELETE FROM public.buffet_items WHERE wedding_id = twid;
  DELETE FROM public.timeline_events WHERE wedding_id = twid;
  DELETE FROM public.gift_items WHERE wedding_id = twid;
  DELETE FROM public.invitations WHERE wedding_id = twid;
  DELETE FROM public.rsvp_tokens WHERE wedding_id = twid;
  DELETE FROM public.checkin_logs WHERE wedding_id = twid;
  DELETE FROM public.admin_logs WHERE wedding_id = twid;
  DELETE FROM public.events WHERE wedding_id = twid;
  DELETE FROM public.guests WHERE wedding_id = twid;
  DELETE FROM public.user_weddings WHERE wedding_id = twid;
  DELETE FROM public.pending_users WHERE wedding_id = twid;
  DELETE FROM public.wedding_details WHERE id = twid;
END $$;