import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, CheckSquare } from "lucide-react";
import { MENU_LABELS, MenuKey } from "@/lib/permissions";

// Define menu order matching the sidebar
const MENU_ORDER: MenuKey[] = [
  "detalhes",
  "usuarios", 
  "eventos",
  "convidados",
  "checkin",
  "presentes",
  "cronograma",
  "buffet",
  "playlist",
  "momentos",
  "estatisticas",
  "logs"
];

interface Permission {
  menu_key: MenuKey;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_publish: boolean;
}

interface RolePermissionsManagerProps {
  roleKey: string;
  roleLabel: string;
}

// Define which menus have which permissions
const MENU_PERMISSIONS: Record<MenuKey, Array<"view" | "add" | "edit" | "delete" | "publish">> = {
  estatisticas: ["view"],
  detalhes: ["view", "edit"],
  convidados: ["view", "add", "edit", "delete"],
  eventos: ["view", "add", "edit", "delete"],
  cronograma: ["view", "add", "edit", "delete", "publish"],
  buffet: ["view", "add", "edit", "delete", "publish"],
  playlist: ["view", "add", "edit", "delete", "publish"],
  presentes: ["view", "add", "edit", "delete", "publish"],
  momentos: ["view", "add", "edit", "delete"],
  checkin: ["view"],
  usuarios: ["view", "add", "edit", "delete"],
  logs: ["view"],
};

const PERMISSION_LABELS: Record<string, string> = {
  view: "Pode visualizar menu",
  add: "Pode adicionar itens",
  edit: "Pode alterar",
  delete: "Pode excluir itens",
  publish: "Pode tornar público",
};

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

      // Initialize permissions for all menus in the same order as sidebar
      const allPermissions: Permission[] = MENU_ORDER.map((key) => {
        const existing = permissionsMap.get(key);
        return {
          menu_key: key,
          can_view: existing?.can_view || false,
          can_add: existing?.can_add || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false,
          can_publish: existing?.can_publish || false,
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

  const handleSelectAll = async () => {
    setSaving(true);
    try {
      const updates = permissions.map((permission) => {
        const availablePermissions = MENU_PERMISSIONS[permission.menu_key];
        return {
          role_key: roleKey,
          menu_key: permission.menu_key,
          can_view: availablePermissions.includes("view"),
          can_add: availablePermissions.includes("add"),
          can_edit: availablePermissions.includes("edit"),
          can_delete: availablePermissions.includes("delete"),
          can_publish: availablePermissions.includes("publish"),
        };
      });

      const { error } = await supabase
        .from("admin_permissions")
        .upsert(updates, {
          onConflict: "role_key,menu_key"
        });

      if (error) throw error;

      toast({
        title: "Todas as permissões habilitadas",
        description: "Todas as permissões disponíveis foram ativadas.",
      });

      fetchPermissions();
    } catch (error: any) {
      console.error("Error selecting all permissions:", error);
      toast({
        title: "Erro ao habilitar permissões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          can_publish: false,
        };
      }

      // If checking any sub-permission, ensure can_view is checked
      if (field !== "can_view" && value && !permission.can_view) {
        updatedPermission.can_view = true;
      }

      const { error } = await supabase
        .from("admin_permissions")
        .upsert(
          {
            role_key: roleKey,
            menu_key: menuKey,
            can_view: updatedPermission.can_view,
            can_add: updatedPermission.can_add,
            can_edit: updatedPermission.can_edit,
            can_delete: updatedPermission.can_delete,
            can_publish: updatedPermission.can_publish,
          },
          {
            onConflict: "role_key,menu_key"
          }
        );

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permissões: {roleLabel}</CardTitle>
            <CardDescription>
              Configure as permissões para este papel em cada menu do sistema
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={saving}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Selecionar Todas
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((permission, index) => {
          const availablePermissions = MENU_PERMISSIONS[permission.menu_key];
          
          return (
            <div key={permission.menu_key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {MENU_LABELS[permission.menu_key]}
                </Label>

                <div className="space-y-2 pl-4">
                  {availablePermissions.map((permType) => (
                    <div 
                      key={permType}
                      className={`flex items-center space-x-2 ${permType !== "view" ? "pl-6" : ""}`}
                    >
                      <Checkbox
                        id={`${permission.menu_key}-${permType}`}
                        checked={permission[`can_${permType}` as keyof Permission] as boolean}
                        onCheckedChange={(checked) =>
                          updatePermission(
                            permission.menu_key,
                            `can_${permType}` as keyof Omit<Permission, "menu_key">,
                            checked as boolean
                          )
                        }
                        disabled={
                          (permType !== "view" && !permission.can_view) || saving
                        }
                      />
                      <Label
                        htmlFor={`${permission.menu_key}-${permType}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {PERMISSION_LABELS[permType]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default RolePermissionsManager;
