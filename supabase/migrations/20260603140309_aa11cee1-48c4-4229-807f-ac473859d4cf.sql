ALTER TABLE public.wedding_details
ADD COLUMN IF NOT EXISTS is_public_showcase boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_wedding_details_showcase
  ON public.wedding_details (is_public_showcase, event_type, wedding_date)
  WHERE is_public_showcase = true;