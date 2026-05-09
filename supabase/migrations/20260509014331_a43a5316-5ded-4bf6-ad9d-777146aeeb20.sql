
-- Fase 6: índices wedding_id em tabelas filhas (idempotente)
CREATE INDEX IF NOT EXISTS idx_invitations_wedding_id ON public.invitations(wedding_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_wedding_id ON public.rsvps(wedding_id);
CREATE INDEX IF NOT EXISTS idx_gift_items_wedding_id ON public.gift_items(wedding_id);
CREATE INDEX IF NOT EXISTS idx_buffet_items_wedding_id ON public.buffet_items(wedding_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_wedding_id ON public.playlist_songs(wedding_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_wedding_id ON public.timeline_events(wedding_id);
CREATE INDEX IF NOT EXISTS idx_photos_wedding_id ON public.photos(wedding_id);
CREATE INDEX IF NOT EXISTS idx_events_wedding_id ON public.events(wedding_id);

-- NOT NULL — todos os registros já estão preenchidos (verificado antes da migração)
ALTER TABLE public.invitations     ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.rsvps           ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.gift_items      ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.buffet_items    ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.playlist_songs  ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.timeline_events ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.photos          ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.events          ALTER COLUMN wedding_id SET NOT NULL;
