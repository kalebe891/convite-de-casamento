-- Etapa 1.26.03 — Refatoração das funções centrais de autorização
-- Nenhuma policy RLS é alterada. Nenhuma assinatura pública é alterada.

-- 1) Função auxiliar (NOVA): resolve permissão a partir do papel de tenant
--    user_weddings.role -> role_profiles -> admin_permissions
CREATE OR REPLACE FUNCTION public.has_wedding_role_permission(
  _user_id uuid,
  _wedding_id uuid,
  _menu_key text,
  _permission_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_weddings uw
    JOIN public.role_profiles rp ON rp.role_key = uw.role
    JOIN public.admin_permissions ap ON ap.role_key = rp.role_key
    WHERE uw.user_id = _user_id
      AND uw.wedding_id = _wedding_id
      AND ap.menu_key = _menu_key
      AND CASE _permission_type
        WHEN 'view'    THEN ap.can_view
        WHEN 'add'     THEN ap.can_add
        WHEN 'edit'    THEN ap.can_edit
        WHEN 'delete'  THEN ap.can_delete
        WHEN 'publish' THEN ap.can_publish
        ELSE false
      END = true
  );
$$;

-- 2) Função auxiliar (NOVA): papel de plataforma (global) do usuário
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- 3) has_table_permission_for_wedding: agora centraliza a autorização de tenant
--    baseada em user_weddings.role (assinatura preservada)
CREATE OR REPLACE FUNCTION public.has_table_permission_for_wedding(
  _user_id uuid,
  _wedding_id uuid,
  _menu_key text,
  _permission_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _wedding_id IS NOT NULL
    AND _user_id IS NOT NULL
    AND (
      -- Papel global de plataforma: acesso total
      public.is_platform_admin(_user_id)
      -- Fonte de verdade do tenant: papel do usuário neste casamento
      OR public.has_wedding_role_permission(_user_id, _wedding_id, _menu_key, _permission_type)
      -- Compatibilidade retroativa (modelo legado global + vínculo ao casamento)
      OR (
        public.user_has_wedding_access(_user_id, _wedding_id)
        AND public.has_table_permission(_user_id, _menu_key, _permission_type)
      )
    );
$$;

-- 4) user_has_wedding_access: refatoração interna, comportamento preservado
CREATE OR REPLACE FUNCTION public.user_has_wedding_access(_user_id uuid, _wedding_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _wedding_id IS NOT NULL
    AND (
      public.is_platform_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_weddings
        WHERE user_id = _user_id AND wedding_id = _wedding_id
      )
    );
$$;

-- 5) get_user_wedding_ids: refatoração interna, comportamento preservado
CREATE OR REPLACE FUNCTION public.get_user_wedding_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT wd.id
  FROM public.wedding_details wd
  WHERE public.is_platform_admin(_user_id)
  UNION
  SELECT uw.wedding_id
  FROM public.user_weddings uw
  WHERE uw.user_id = _user_id;
$$;
