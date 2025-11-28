import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MENU_LABELS, MenuKey, upsertPermission, getUserPermissions, Permission } from "@/lib/permissions";

interface PermissionsManagerProps {
  userId: string;
  userName: string;
}

const PermissionsManager = ({ userId, userName }: PermissionsManagerProps) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<MenuKey, Permission>>({} as any);
  const [loading, setLoading] = useState(true);

  const menuKeys = Object.keys(MENU_LABELS) as MenuKey[];

  useEffect(() => {
    fetchPermissions();
  }, [userId]);

  const fetchPermissions = async () => {
    setLoading(true);
    const userPermissions = await getUserPermissions(userId);
    
    const permissionsMap: Record<MenuKey, Permission> = {} as any;
    menuKeys.forEach(key => {
      const existing = userPermissions.find(p => p.menu_key === key);
      permissionsMap[key] = existing || {
        id: "",
        user_id: userId,
        menu_key: key,
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
      };
    });

    setPermissions(permissionsMap);
    setLoading(false);
  };

  const handlePermissionChange = async (
    menuKey: MenuKey,
    permissionType: "can_view" | "can_add" | "can_edit" | "can_delete",
    value: boolean
  ) => {
    const currentPermission = permissions[menuKey];
    
    // Se desmarcar "can_view", desmarcar todos os outros
    if (permissionType === "can_view" && !value) {
      const updatedPermission = {
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
      };

      const success = await upsertPermission(userId, menuKey, updatedPermission);
      
      if (success) {
        setPermissions(prev => ({
          ...prev,
          [menuKey]: { ...currentPermission, ...updatedPermission }
        }));
        toast({
          title: "Permissão atualizada",
          description: `Todas as permissões de ${MENU_LABELS[menuKey]} foram removidas`,
        });
      }
      return;
    }

    // Se marcar qualquer permissão que não seja view, garantir que view está marcado
    if (permissionType !== "can_view" && value && !currentPermission.can_view) {
      const updatedPermission = {
        can_view: true,
        [permissionType]: value,
      };

      const success = await upsertPermission(userId, menuKey, updatedPermission);
      
      if (success) {
        setPermissions(prev => ({
          ...prev,
          [menuKey]: { ...currentPermission, ...updatedPermission }
        }));
        toast({
          title: "Permissão atualizada",
          description: `Permissão de visualização foi habilitada automaticamente`,
        });
      }
      return;
    }

    // Atualização normal
    const updatedPermission = {
      [permissionType]: value,
    };

    const success = await upsertPermission(userId, menuKey, updatedPermission);
    
    if (success) {
      setPermissions(prev => ({
        ...prev,
        [menuKey]: { ...currentPermission, ...updatedPermission }
      }));
      toast({
        title: "Permissão atualizada",
        description: `Permissão de ${MENU_LABELS[menuKey]} foi ${value ? "habilitada" : "desabilitada"}`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a permissão",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando permissões...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões de {userName}</CardTitle>
        <CardDescription>
          Configure as permissões de acesso aos menus do painel administrativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {menuKeys.map(menuKey => {
          const perm = permissions[menuKey];
          const canView = perm?.can_view || false;

          return (
            <div key={menuKey} className="space-y-3 pb-4 border-b last:border-b-0">
              <h4 className="font-semibold">{MENU_LABELS[menuKey]}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${menuKey}-view`}
                    checked={canView}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(menuKey, "can_view", checked as boolean)
                    }
                  />
                  <Label htmlFor={`${menuKey}-view`} className="cursor-pointer">
                    Visualizar menu
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${menuKey}-add`}
                    checked={perm?.can_add || false}
                    disabled={!canView}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(menuKey, "can_add", checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`${menuKey}-add`} 
                    className={canView ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                  >
                    Adicionar itens
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${menuKey}-edit`}
                    checked={perm?.can_edit || false}
                    disabled={!canView}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(menuKey, "can_edit", checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`${menuKey}-edit`}
                    className={canView ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                  >
                    Editar itens
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${menuKey}-delete`}
                    checked={perm?.can_delete || false}
                    disabled={!canView}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(menuKey, "can_delete", checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`${menuKey}-delete`}
                    className={canView ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                  >
                    Excluir itens
                  </Label>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PermissionsManager;
