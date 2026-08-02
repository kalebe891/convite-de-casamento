-- Etapa 1.26.05: cadastro oficial do menu_key 'convites'
-- Permissões derivadas do módulo equivalente 'convidados' de cada perfil.
INSERT INTO public.admin_permissions (role_key, menu_key, can_view, can_add, can_edit, can_delete, can_publish)
SELECT ap.role_key, 'convites', ap.can_view, ap.can_add, ap.can_edit, ap.can_delete, false
FROM public.admin_permissions ap
WHERE ap.menu_key = 'convidados'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_permissions x
    WHERE x.role_key = ap.role_key AND x.menu_key = 'convites'
  );