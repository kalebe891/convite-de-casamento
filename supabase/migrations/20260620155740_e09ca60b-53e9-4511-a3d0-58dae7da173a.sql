ALTER TABLE public.wedding_details
  ADD COLUMN IF NOT EXISTS show_pix_section boolean NOT NULL DEFAULT true;

UPDATE public.wedding_details SET show_pix_section = true WHERE show_pix_section IS NULL;