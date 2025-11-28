import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { getUserPermissions, hasPermission, MenuKey, PermissionType, Permission } from "@/lib/permissions";

export const usePermissions = (menuKey?: MenuKey) => {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Admins têm todas as permissões
      if (role === "admin") {
        setLoading(false);
        return;
      }

      const userPermissions = await getUserPermissions(user.id);
      setPermissions(userPermissions);
      setLoading(false);
    };

    fetchPermissions();
  }, [user, role]);

  const checkPermission = async (
    permissionType: PermissionType,
    targetMenuKey?: MenuKey
  ): Promise<boolean> => {
    if (!user) return false;
    
    // Admins têm todas as permissões
    if (role === "admin") return true;

    const key = targetMenuKey || menuKey;
    if (!key) return false;

    return await hasPermission(user.id, key, permissionType);
  };

  const canView = async (targetMenuKey?: MenuKey): Promise<boolean> => {
    return checkPermission("can_view", targetMenuKey);
  };

  const canAdd = async (targetMenuKey?: MenuKey): Promise<boolean> => {
    return checkPermission("can_add", targetMenuKey);
  };

  const canEdit = async (targetMenuKey?: MenuKey): Promise<boolean> => {
    return checkPermission("can_edit", targetMenuKey);
  };

  const canDelete = async (targetMenuKey?: MenuKey): Promise<boolean> => {
    return checkPermission("can_delete", targetMenuKey);
  };

  return {
    permissions,
    loading,
    isAdmin: role === "admin",
    canView,
    canAdd,
    canEdit,
    canDelete,
  };
};
