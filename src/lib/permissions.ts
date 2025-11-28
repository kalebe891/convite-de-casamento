import { supabase } from "@/integrations/supabase/client";

export type MenuKey = 
  | "estatisticas"
  | "detalhes"
  | "convidados"
  | "eventos"
  | "cronograma"
  | "buffet"
  | "playlist"
  | "presentes"
  | "momentos"
  | "checkin"
  | "usuarios"
  | "logs";

export type PermissionType = "can_view" | "can_add" | "can_edit" | "can_delete";

export interface Permission {
  id: string;
  user_id: string;
  menu_key: MenuKey;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const MENU_LABELS: Record<MenuKey, string> = {
  estatisticas: "Estatísticas",
  detalhes: "Detalhes",
  convidados: "Convidados",
  eventos: "Eventos",
  cronograma: "Cronograma",
  buffet: "Buffet",
  playlist: "Playlist",
  presentes: "Presentes",
  momentos: "Momentos",
  checkin: "Check-in",
  usuarios: "Usuários",
  logs: "Logs"
};

/**
 * Busca todas as permissões de um usuário
 */
export const getUserPermissions = async (userId: string): Promise<Permission[]> => {
  const { data, error } = await supabase
    .from("admin_permissions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching permissions:", error);
    return [];
  }

  return (data || []) as Permission[];
};

/**
 * Verifica se um usuário tem uma permissão específica
 */
export const hasPermission = async (
  userId: string,
  menuKey: MenuKey,
  permissionType: PermissionType
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("admin_permissions")
    .select(permissionType)
    .eq("user_id", userId)
    .eq("menu_key", menuKey)
    .maybeSingle();

  if (error) {
    console.error("Error checking permission:", error);
    return false;
  }

  return data?.[permissionType] || false;
};

/**
 * Atualiza ou cria uma permissão
 */
export const upsertPermission = async (
  userId: string,
  menuKey: MenuKey,
  permissions: Partial<Omit<Permission, "id" | "user_id" | "menu_key">>
): Promise<boolean> => {
  const { error } = await supabase
    .from("admin_permissions")
    .upsert(
      {
        user_id: userId,
        menu_key: menuKey,
        ...permissions,
      },
      {
        onConflict: "user_id,menu_key",
      }
    );

  if (error) {
    console.error("Error upserting permission:", error);
    return false;
  }

  return true;
};

/**
 * Deleta todas as permissões de um usuário
 */
export const deleteUserPermissions = async (userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("admin_permissions")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting permissions:", error);
    return false;
  }

  return true;
};
