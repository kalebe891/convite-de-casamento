import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Permission, MenuKey } from "@/lib/permissions";
import { devLog } from "@/lib/devLog";

interface PermissionsState {
  permissions: Permission[];
  loading: boolean;
  initialized: boolean;
  hasPermission: (menuKey: MenuKey, type: "view" | "add" | "edit" | "delete" | "publish") => boolean;
}

export const usePermissions = (): PermissionsState => {
  const { user, role, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    devLog('🔍 [usePermissions] Effect triggered:', { role, authLoading, initialized });

    if (authLoading) {
      devLog('⏳ [usePermissions] Waiting for auth to load');
      return;
    }

    if (role) {
      devLog('🔍 [usePermissions] Role found, fetching permissions:', role);
      fetchPermissions();
    } else {
      devLog('⚠️ [usePermissions] No role after auth loaded');
      setLoading(false);
      setPermissions([]);
      setInitialized(true);
    }
  }, [role, authLoading]);

  const fetchPermissions = async () => {
    if (!role) {
      devLog('⚠️ [usePermissions] No role provided, skipping fetch');
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      devLog('🔍 [usePermissions] Fetching permissions for role:', role);
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("role_key", role);

      if (error) {
        console.error("❌ [usePermissions] Error fetching permissions:", error);
        setPermissions([]);
      } else {
        const perms = (data || []) as Permission[];
        devLog('✅ [usePermissions] Permissions fetched:', perms.length, 'items');
        devLog('📋 [usePermissions] Permission details:', perms.map(p => `${p.menu_key}:${p.can_view}`).join(', '));
        setPermissions(perms);
      }
    } catch (error) {
      console.error("❌ [usePermissions] Exception in fetchPermissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const hasPermission = (
    menuKey: MenuKey,
    type: "view" | "add" | "edit" | "delete" | "publish"
  ): boolean => {
    if (role === "admin") {
      return true;
    }

    if (!initialized || loading || !role) {
      return false;
    }

    const permission = permissions.find((p) => p.menu_key === menuKey);
    if (!permission) {
      return false;
    }

    return permission[`can_${type}`] || false;
  };

  return {
    permissions,
    loading,
    hasPermission,
    initialized,
  };
};
