import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Permission, MenuKey } from "@/lib/permissions";

interface PermissionsState {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (menuKey: MenuKey, type: "view" | "add" | "edit" | "delete" | "publish") => boolean;
}

export const usePermissions = (): PermissionsState => {
  const { user, role, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && role) {
      fetchPermissions();
    } else if (!authLoading && !role) {
      setLoading(false);
      setPermissions([]);
    }
  }, [role, authLoading]);

  const fetchPermissions = async () => {
    if (!role) {
      setLoading(false);
      return;
    }

    try {
      // Fetch permissions based on user's role
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("role_key", role);

      if (error) {
        console.error("Error fetching permissions:", error);
        setPermissions([]);
      } else {
        setPermissions((data || []) as Permission[]);
      }
    } catch (error) {
      console.error("Error in fetchPermissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (
    menuKey: MenuKey,
    type: "view" | "add" | "edit" | "delete" | "publish"
  ): boolean => {
    // Admins have all permissions
    if (role === "admin") return true;

    const permission = permissions.find((p) => p.menu_key === menuKey);
    if (!permission) return false;

    return permission[`can_${type}`] || false;
  };

  return {
    permissions,
    loading,
    hasPermission,
  };
};