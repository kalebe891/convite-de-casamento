-- 1) Padronização definitiva da grafia user_demo
INSERT INTO public.role_profiles (role_key, role_label, is_system)
VALUES ('user_demo', 'Usuário Demonstração', false)
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO public.role_profiles (role_key, role_label, is_system)
VALUES ('admin_demo', 'Admin Demonstração', false)
ON CONFLICT (role_key) DO NOTHING;

UPDATE public.user_weddings SET role = 'user_demo' WHERE role = 'User_demo';
UPDATE public.user_roles SET role = 'user_demo' WHERE role = 'User_demo';

DELETE FROM public.admin_permissions WHERE role_key = 'User_demo';
DELETE FROM public.role_profiles WHERE role_key = 'User_demo';

-- 2) user_demo: somente leitura em todos os menus
INSERT INTO public.admin_permissions (role_key, menu_key, can_view, can_add, can_edit, can_delete, can_publish)
SELECT 'user_demo', m.menu_key, true, false, false, false, false
FROM (SELECT DISTINCT menu_key FROM public.admin_permissions WHERE role_key = 'admin') m
ON CONFLICT DO NOTHING;

UPDATE public.admin_permissions
SET can_view = true, can_add = false, can_edit = false, can_delete = false, can_publish = false
WHERE role_key = 'user_demo';

-- 3) admin_demo: réplica exata das permissões do papel usado hoje pelas Demos (admin)
INSERT INTO public.admin_permissions (role_key, menu_key, can_view, can_add, can_edit, can_delete, can_publish)
SELECT 'admin_demo', a.menu_key, a.can_view, a.can_add, a.can_edit, a.can_delete, a.can_publish
FROM public.admin_permissions a
WHERE a.role_key = 'admin'
ON CONFLICT DO NOTHING;

UPDATE public.admin_permissions d
SET can_view = a.can_view,
    can_add = a.can_add,
    can_edit = a.can_edit,
    can_delete = a.can_delete,
    can_publish = a.can_publish
FROM public.admin_permissions a
WHERE a.role_key = 'admin' AND d.role_key = 'admin_demo' AND d.menu_key = a.menu_key;

-- 4) Novas Demos nascem com admin_demo
CREATE OR REPLACE FUNCTION public.create_demo_tenant(_primary_name text, _secondary_name text, _event_date date, _theme_id text DEFAULT 'legacy'::text, _event_type text DEFAULT 'wedding'::text)
 RETURNS TABLE(tenant_id uuid, tenant_slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_theme text;
  v_slug_base text;
  v_slug text;
  v_suffix text;
  v_attempts int := 0;
  v_new_id uuid;
  v_existing_demo uuid;
  v_raw text;
  v_date_part text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _primary_name IS NULL OR length(trim(_primary_name)) = 0 THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF _event_date IS NULL THEN
    RAISE EXCEPTION 'Data do evento obrigatória';
  END IF;

  IF _event_type IS NULL OR _event_type NOT IN ('wedding','birthday') THEN
    _event_type := 'wedding';
  END IF;

  v_theme := COALESCE(_theme_id, 'legacy');
  IF v_theme NOT IN ('legacy','editorial','minimal','modern-noir','art-deco','sky-peach') THEN
    v_theme := 'legacy';
  END IF;

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

  v_raw := trim(_primary_name) ||
    CASE WHEN _secondary_name IS NOT NULL AND length(trim(_secondary_name)) > 0
      THEN '-e-' || trim(_secondary_name)
      ELSE ''
    END;

  v_raw := translate(
    v_raw,
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
  );

  v_slug_base := lower(
    regexp_replace(
      regexp_replace(v_raw, '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    )
  );

  IF v_slug_base IS NULL OR length(v_slug_base) = 0 THEN
    v_slug_base := 'demo';
  END IF;

  v_date_part := to_char(_event_date, 'DD-MM-YYYY');
  v_slug := v_slug_base || '-' || v_date_part;

  IF EXISTS (SELECT 1 FROM public.wedding_details WHERE slug = v_slug) THEN
    LOOP
      v_suffix := substr(md5(random()::text || clock_timestamp()::text), 1, 4);
      v_slug := v_slug_base || '-' || v_date_part || '-' || v_suffix;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wedding_details WHERE slug = v_slug);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Não foi possível gerar um slug único';
      END IF;
    END LOOP;
  END IF;

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
    _event_date,
    true,
    now() + interval '7 days',
    'active',
    now() + interval '7 days',
    false
  )
  RETURNING id INTO v_new_id;

  -- Etapa 1.28.02: Demos nascem com admin_demo (isolado ao próprio tenant)
  INSERT INTO public.user_weddings (user_id, wedding_id, role)
  VALUES (v_uid, v_new_id, 'admin_demo')
  ON CONFLICT (user_id, wedding_id) DO NOTHING;

  RETURN QUERY SELECT v_new_id, v_slug;
END;
$function$;

-- 5) Nenhum usuário criado por autoatendimento (Demo) recebe admin global
CREATE OR REPLACE FUNCTION public.assign_first_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Etapa 1.28.02: apenas o administrador explícito da plataforma recebe papel global.
  -- A regra antiga de "primeiro usuário vira admin" foi removida para impedir que
  -- usuários criados por bases Demo obtenham privilégios globais.
  IF NEW.email = 'kalebehqdelima@hotmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;