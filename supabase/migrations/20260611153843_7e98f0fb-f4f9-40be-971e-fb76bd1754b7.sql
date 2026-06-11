
-- Add demo columns to wedding_details
ALTER TABLE public.wedding_details
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wedding_details_is_demo ON public.wedding_details(is_demo);

-- RPC: create_demo_tenant
-- Creates a 7-day demo tenant for the authenticated user.
-- Generates a unique slug, validates business rules, and links ownership.
CREATE OR REPLACE FUNCTION public.create_demo_tenant(
  _primary_name text,
  _secondary_name text,
  _theme_id text DEFAULT 'legacy',
  _event_type text DEFAULT 'wedding'
)
RETURNS TABLE(tenant_id uuid, tenant_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_theme text;
  v_slug_base text;
  v_slug text;
  v_suffix text;
  v_attempts int := 0;
  v_new_id uuid;
  v_existing_demo uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _primary_name IS NULL OR length(trim(_primary_name)) = 0 THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF _event_type IS NULL OR _event_type NOT IN ('wedding','birthday') THEN
    _event_type := 'wedding';
  END IF;

  v_theme := COALESCE(_theme_id, 'legacy');
  IF v_theme NOT IN ('legacy','editorial','minimal','modern-noir','art-deco','sky-peach') THEN
    v_theme := 'legacy';
  END IF;

  -- Enforce: 1 active demo per user
  SELECT wd.id INTO v_existing_demo
  FROM public.wedding_details wd
  JOIN public.user_weddings uw ON uw.wedding_id = wd.id
  WHERE uw.user_id = v_uid
    AND wd.is_demo = true
    AND COALESCE(wd.tenant_status, 'active') = 'active'
  LIMIT 1;

  IF v_existing_demo IS NOT NULL THEN
    RAISE EXCEPTION 'Você já possui uma demonstração ativa';
  END IF;

  -- Build slug base from primary + secondary names
  v_slug_base := lower(
    regexp_replace(
      regexp_replace(
        unaccent(trim(_primary_name) ||
          CASE WHEN _secondary_name IS NOT NULL AND length(trim(_secondary_name)) > 0
            THEN '-e-' || trim(_secondary_name)
            ELSE ''
          END
        ),
        '[^a-zA-Z0-9]+', '-', 'g'
      ),
      '(^-+|-+$)', '', 'g'
    )
  );

  IF v_slug_base IS NULL OR length(v_slug_base) = 0 THEN
    v_slug_base := 'demo';
  END IF;

  -- Generate unique slug with random suffix
  LOOP
    v_suffix := substr(md5(random()::text || clock_timestamp()::text), 1, 4);
    v_slug := v_slug_base || '-' || v_suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wedding_details WHERE slug = v_slug);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Não foi possível gerar um slug único';
    END IF;
  END LOOP;

  INSERT INTO public.wedding_details (
    slug, event_type, theme_id,
    bride_name, groom_name, wedding_date,
    is_demo, demo_expires_at,
    tenant_status, expires_at,
    is_public_showcase
  ) VALUES (
    v_slug, _event_type, v_theme,
    trim(_primary_name),
    COALESCE(NULLIF(trim(_secondary_name), ''), 'A definir'),
    (now() + interval '90 days')::date,
    true,
    now() + interval '7 days',
    'active',
    now() + interval '7 days',
    false
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.user_weddings (user_id, wedding_id, role)
  VALUES (v_uid, v_new_id, 'admin')
  ON CONFLICT (user_id, wedding_id) DO NOTHING;

  RETURN QUERY SELECT v_new_id, v_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.create_demo_tenant(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_demo_tenant(text, text, text, text) TO authenticated;
