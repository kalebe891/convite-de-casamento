ALTER TABLE public.wedding_details DROP CONSTRAINT IF EXISTS wedding_details_theme_id_check;
ALTER TABLE public.wedding_details
  ADD CONSTRAINT wedding_details_theme_id_check
  CHECK (theme_id = ANY (ARRAY['legacy'::text, 'editorial'::text, 'minimal'::text]));

CREATE OR REPLACE FUNCTION public.create_new_event(
  _slug text,
  _event_type text DEFAULT 'wedding'::text,
  _primary_name text DEFAULT 'A definir'::text,
  _secondary_name text DEFAULT 'A definir'::text,
  _event_date date DEFAULT (((now())::date + '1 year'::interval))::date,
  _theme_id text DEFAULT 'legacy'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_event_id uuid;
  v_slug text;
  v_theme text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão para criar novo evento';
  END IF;

  IF _slug IS NULL OR length(trim(_slug)) = 0 THEN
    RAISE EXCEPTION 'Slug obrigatório';
  END IF;

  IF _event_type NOT IN ('wedding', 'birthday') THEN
    RAISE EXCEPTION 'Tipo de evento inválido';
  END IF;

  v_theme := COALESCE(_theme_id, 'legacy');
  IF v_theme NOT IN ('legacy', 'editorial', 'minimal') THEN
    v_theme := 'legacy';
  END IF;

  v_slug := lower(trim(_slug));

  IF EXISTS (SELECT 1 FROM public.wedding_details WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug já está em uso';
  END IF;

  INSERT INTO public.wedding_details (
    slug, event_type, bride_name, groom_name, wedding_date, theme_id
  ) VALUES (
    v_slug, _event_type, _primary_name, _secondary_name, _event_date, v_theme
  )
  RETURNING id INTO new_event_id;

  RETURN new_event_id;
END;
$function$;