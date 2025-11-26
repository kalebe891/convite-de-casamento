-- Add show_gifts_section field to wedding_details table
ALTER TABLE public.wedding_details
ADD COLUMN show_gifts_section boolean DEFAULT true;

COMMENT ON COLUMN public.wedding_details.show_gifts_section IS 'Controls whether the entire gifts section is visible on the homepage';