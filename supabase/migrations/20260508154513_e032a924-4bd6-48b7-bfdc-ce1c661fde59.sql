
-- Phase 5: Add wedding_id to link/audit tables

-- rsvp_tokens
ALTER TABLE public.rsvp_tokens
  ADD COLUMN IF NOT EXISTS wedding_id uuid REFERENCES public.wedding_details(id) ON DELETE CASCADE;

-- admin_logs
ALTER TABLE public.admin_logs
  ADD COLUMN IF NOT EXISTS wedding_id uuid REFERENCES public.wedding_details(id) ON DELETE SET NULL;

-- checkin_logs
ALTER TABLE public.checkin_logs
  ADD COLUMN IF NOT EXISTS wedding_id uuid REFERENCES public.wedding_details(id) ON DELETE SET NULL;

-- pending_users
ALTER TABLE public.pending_users
  ADD COLUMN IF NOT EXISTS wedding_id uuid REFERENCES public.wedding_details(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rsvp_tokens_wedding_id   ON public.rsvp_tokens(wedding_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_wedding_id    ON public.admin_logs(wedding_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_wedding_id  ON public.checkin_logs(wedding_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_wedding_id ON public.pending_users(wedding_id);

-- Backfill checkin_logs from guests.wedding_id via guest_id
UPDATE public.checkin_logs cl
SET wedding_id = g.wedding_id
FROM public.guests g
WHERE cl.guest_id = g.id
  AND cl.wedding_id IS NULL;

-- Backfill admin_logs: derive from guests when table_name='guests' and record_id is a uuid pointing to guests
UPDATE public.admin_logs al
SET wedding_id = g.wedding_id
FROM public.guests g
WHERE al.table_name = 'guests'
  AND al.record_id::uuid = g.id
  AND al.wedding_id IS NULL;

-- Remaining admin_logs: backfill historical rows to current single wedding (controlled historic backfill)
UPDATE public.admin_logs
SET wedding_id = (SELECT id FROM public.wedding_details WHERE slug = 'beatriz-e-diogo' LIMIT 1)
WHERE wedding_id IS NULL;
