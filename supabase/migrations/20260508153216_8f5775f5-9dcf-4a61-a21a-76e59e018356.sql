
-- Passo 2: adicionar wedding_id nullable
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS wedding_id uuid REFERENCES public.wedding_details(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_guests_wedding_id ON public.guests(wedding_id);

-- Passo 3: backfill por slug
UPDATE public.guests
SET wedding_id = (SELECT id FROM public.wedding_details WHERE slug='beatriz-e-diogo' LIMIT 1)
WHERE wedding_id IS NULL;

-- Passo 4: tornar NOT NULL
ALTER TABLE public.guests ALTER COLUMN wedding_id SET NOT NULL;

-- Passo 5: substituir índices únicos globais por índices por casamento
-- Nota: a coluna real é archived_at (não deleted_at)
DROP INDEX IF EXISTS public.idx_guests_unique_active_email;
DROP INDEX IF EXISTS public.idx_guests_unique_active_phone;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_unique_active_email_per_wedding
  ON public.guests(wedding_id, email)
  WHERE archived_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_unique_active_phone_per_wedding
  ON public.guests(wedding_id, phone)
  WHERE archived_at IS NULL AND phone IS NOT NULL;
