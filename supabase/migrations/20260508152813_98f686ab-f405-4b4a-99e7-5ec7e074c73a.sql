
CREATE OR REPLACE FUNCTION public.create_new_event(
  _slug text,
  _event_type text DEFAULT 'wedding',
  _primary_name text DEFAULT 'A definir',
  _secondary_name text DEFAULT 'A definir',
  _event_date date DEFAULT (now()::date + INTERVAL '1 year')::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_event_id uuid;
  v_slug text;
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

  v_slug := lower(trim(_slug));

  IF EXISTS (SELECT 1 FROM public.wedding_details WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug já está em uso';
  END IF;

  INSERT INTO public.wedding_details (
    slug, event_type, theme_id,
    bride_name, groom_name, wedding_date
  )
  VALUES (
    v_slug, _event_type, 'default',
    _primary_name, _secondary_name, _event_date
  )
  RETURNING id INTO new_event_id;

  INSERT INTO public.user_weddings (user_id, wedding_id, role)
  VALUES (auth.uid(), new_event_id, 'admin')
  ON CONFLICT (user_id, wedding_id) DO NOTHING;

  RETURN new_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_new_event(text, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_new_event(text, text, text, text, date) TO authenticated;
