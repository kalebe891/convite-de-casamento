import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Permission, MenuKey } from "@/lib/permissions";

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
    console.log('🔍 [usePermissions] Effect triggered:', { role, authLoading, initialized });
    if (!authLoading && role) {
      fetchPermissions();
    } else if (!authLoading && !role) {
      console.log('⚠️ [usePermissions] No role after auth loaded');
      setLoading(false);
      setPermissions([]);
      setInitialized(true);
    }
  }, [role, authLoading]);

  const fetchPermissions = async () => {
    if (!role) {
      console.log('⚠️ [usePermissions] No role provided, skipping fetch');
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      console.log('🔍 [usePermissions] Fetching permissions for role:', role);
      // Fetch permissions based on user's role
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("role_key", role);

      if (error) {
        console.error("❌ [usePermissions] Error fetching permissions:", error);
        setPermissions([]);
      } else {
        const perms = (data || []) as Permission[];
        console.log('✅ [usePermissions] Permissions fetched:', perms.length, 'items');
        console.log('📋 [usePermissions] Permission details:', perms.map(p => `${p.menu_key}:${p.can_view}`).join(', '));
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
    // Admins always have all permissions
    if (role === "admin") {
      console.log(`✅ [hasPermission] Admin has full access to ${menuKey}.${type}`);
      return true;
    }

    // No permissions loaded yet
    if (loading || !role) {
      console.log(`⏳ [hasPermission] Still loading permissions for ${menuKey}.${type}`);
      return false;
    }

    const permission = permissions.find((p) => p.menu_key === menuKey);
    if (!permission) {
      console.log(`❌ [hasPermission] No permission entry found for ${menuKey}`);
      return false;
    }

    const hasAccess = permission[`can_${type}`] || false;
    console.log(`${hasAccess ? '✅' : '❌'} [hasPermission] ${menuKey}.${type} = ${hasAccess}`);
    return hasAccess;
  };

  return {
    permissions,
    loading,
    hasPermission,
    initialized,
  };
};