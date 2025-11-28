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

export type PermissionType = "can_view" | "can_add" | "can_edit" | "can_delete" | "can_publish";

export interface Permission {
  id: string;
  role_key: string;
  menu_key: MenuKey;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_publish: boolean;
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
 * Get all permissions for a specific role
 */
export const getRolePermissions = async (roleKey: string): Promise<Permission[]> => {
  try {
    const { data, error } = await supabase
      .from("admin_permissions")
      .select("*")
      .eq("role_key", roleKey);

    if (error) {
      console.error("Error fetching role permissions:", error);
      return [];
    }

    return (data || []) as Permission[];
  } catch (error) {
    console.error("Error in getRolePermissions:", error);
    return [];
  }
};

/**
 * Check if a role has a specific permission for a menu
 */
export const hasRolePermission = async (
  roleKey: string,
  menuKey: MenuKey,
  permissionType: "view" | "add" | "edit" | "delete"
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("admin_permissions")
      .select(`can_${permissionType}`)
      .eq("role_key", roleKey)
      .eq("menu_key", menuKey)
      .maybeSingle();

    if (error) {
      console.error("Error checking permission:", error);
      return false;
    }

    if (!data) return false;

    return data[`can_${permissionType}`] || false;
  } catch (error) {
    console.error("Error in hasRolePermission:", error);
    return false;
  }
};

/**
 * Upsert a permission for a role
 */
export const upsertPermission = async (
  roleKey: string,
  menuKey: MenuKey,
  permissions: Partial<Omit<Permission, "id" | "role_key" | "menu_key">>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("admin_permissions")
      .upsert([
        {
          role_key: roleKey,
          menu_key: menuKey,
          ...permissions,
        },
      ]);

    if (error) {
      console.error("Error upserting permission:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in upsertPermission:", error);
    throw error;
  }
};

/**
 * Delete all permissions for a role
 */
export const deleteRolePermissions = async (roleKey: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("admin_permissions")
      .delete()
      .eq("role_key", roleKey);

    if (error) {
      console.error("Error deleting role permissions:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteRolePermissions:", error);
    throw error;
  }
};