import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { MENU_LABELS, MenuKey } from "@/lib/permissions";

interface Permission {
  menu_key: MenuKey;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface RolePermissionsManagerProps {
  roleKey: string;
  roleLabel: string;
}

const RolePermissionsManager = ({ roleKey, roleLabel }: RolePermissionsManagerProps) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [roleKey]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("role_key", roleKey);

      if (error) throw error;

      // Create a map of existing permissions
      const permissionsMap = new Map(
        (data || []).map((p) => [p.menu_key, p])
      );

      // Initialize permissions for all menus
      const allPermissions: Permission[] = Object.keys(MENU_LABELS).map((key) => {
        const existing = permissionsMap.get(key as MenuKey);
        return {
          menu_key: key as MenuKey,
          can_view: existing?.can_view || false,
          can_add: existing?.can_add || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false,
        };
      });

      setPermissions(allPermissions);
    } catch (error: any) {
      console.error("Error fetching permissions:", error);
      toast({
        title: "Erro ao carregar permissões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    menuKey: MenuKey,
    field: keyof Omit<Permission, "menu_key">,
    value: boolean
  ) => {
    setSaving(true);
    try {
      const permission = permissions.find((p) => p.menu_key === menuKey);
      if (!permission) return;

      let updatedPermission = { ...permission, [field]: value };

      // If unchecking can_view, uncheck all other permissions
      if (field === "can_view" && !value) {
        updatedPermission = {
          ...updatedPermission,
          can_add: false,
          can_edit: false,
          can_delete: false,
        };
      }

      // If checking any sub-permission, ensure can_view is checked
      if (field !== "can_view" && value && !permission.can_view) {
        updatedPermission.can_view = true;
      }

      const { error } = await supabase
        .from("admin_permissions")
        .upsert({
          role_key: roleKey,
          menu_key: menuKey,
          can_view: updatedPermission.can_view,
          can_add: updatedPermission.can_add,
          can_edit: updatedPermission.can_edit,
          can_delete: updatedPermission.can_delete,
        });

      if (error) throw error;

      setPermissions((prev) =>
        prev.map((p) => (p.menu_key === menuKey ? updatedPermission : p))
      );

      toast({
        title: "Permissão atualizada",
        description: "As permissões foram salvas com sucesso.",
      });
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões: {roleLabel}</CardTitle>
        <CardDescription>
          Configure as permissões para este papel em cada menu do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((permission, index) => (
          <div key={permission.menu_key}>
            {index > 0 && <Separator className="my-4" />}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {MENU_LABELS[permission.menu_key]}
              </Label>

              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${permission.menu_key}-view`}
                    checked={permission.can_view}
                    onCheckedChange={(checked) =>
                      updatePermission(
                        permission.menu_key,
                        "can_view",
                        checked as boolean
                      )
                    }
                    disabled={saving}
                  />
                  <Label
                    htmlFor={`${permission.menu_key}-view`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    Pode visualizar menu
                  </Label>
                </div>

                <div className="flex items-center space-x-2 pl-6">
                  <Checkbox
                    id={`${permission.menu_key}-add`}
                    checked={permission.can_add}
                    onCheckedChange={(checked) =>
                      updatePermission(
                        permission.menu_key,
                        "can_add",
                        checked as boolean
                      )
                    }
                    disabled={!permission.can_view || saving}
                  />
                  <Label
                    htmlFor={`${permission.menu_key}-add`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    Pode adicionar itens
                  </Label>
                </div>

                <div className="flex items-center space-x-2 pl-6">
                  <Checkbox
                    id={`${permission.menu_key}-edit`}
                    checked={permission.can_edit}
                    onCheckedChange={(checked) =>
                      updatePermission(
                        permission.menu_key,
                        "can_edit",
                        checked as boolean
                      )
                    }
                    disabled={!permission.can_view || saving}
                  />
                  <Label
                    htmlFor={`${permission.menu_key}-edit`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    Pode alterar itens
                  </Label>
                </div>

                <div className="flex items-center space-x-2 pl-6">
                  <Checkbox
                    id={`${permission.menu_key}-delete`}
                    checked={permission.can_delete}
                    onCheckedChange={(checked) =>
                      updatePermission(
                        permission.menu_key,
                        "can_delete",
                        checked as boolean
                      )
                    }
                    disabled={!permission.can_view || saving}
                  />
                  <Label
                    htmlFor={`${permission.menu_key}-delete`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    Pode excluir itens
                  </Label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RolePermissionsManager;