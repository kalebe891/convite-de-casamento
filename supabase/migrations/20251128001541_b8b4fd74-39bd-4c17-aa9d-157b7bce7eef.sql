-- Adicionar campo is_secondary na tabela photos
ALTER TABLE public.photos
ADD COLUMN is_secondary boolean DEFAULT false;

-- Criar função para garantir apenas uma foto secundária por casamento
CREATE OR REPLACE FUNCTION public.ensure_single_secondary_photo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se marcando como secundária, desmarcar outras fotos secundárias do mesmo casamento
  IF NEW.is_secondary = true THEN
    UPDATE public.photos
    SET is_secondary = false
    WHERE wedding_id = NEW.wedding_id
      AND id != NEW.id
      AND is_secondary = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para garantir foto secundária única
DROP TRIGGER IF EXISTS ensure_single_secondary_photo_trigger ON public.photos;
CREATE TRIGGER ensure_single_secondary_photo_trigger
  BEFORE INSERT OR UPDATE ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_secondary_photo();