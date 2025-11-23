-- Add is_main field to photos table to track the main photo
ALTER TABLE public.photos 
ADD COLUMN is_main boolean DEFAULT false;

-- Create index for faster queries on is_main
CREATE INDEX idx_photos_is_main ON public.photos(wedding_id, is_main) WHERE is_main = true;

-- Create function to ensure only one photo is main per wedding
CREATE OR REPLACE FUNCTION public.ensure_single_main_photo()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a photo as main, unset all other main photos for this wedding
  IF NEW.is_main = true THEN
    UPDATE public.photos
    SET is_main = false
    WHERE wedding_id = NEW.wedding_id
      AND id != NEW.id
      AND is_main = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce single main photo
CREATE TRIGGER enforce_single_main_photo
BEFORE INSERT OR UPDATE ON public.photos
FOR EACH ROW
WHEN (NEW.is_main = true)
EXECUTE FUNCTION public.ensure_single_main_photo();