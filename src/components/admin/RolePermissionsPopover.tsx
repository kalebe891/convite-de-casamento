import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, X, Shield, UserCog, Users as UsersIcon, Settings } from "lucide-react";
import { MENU_LABELS, MenuKey } from "@/lib/permissions";

const MENU_ORDER: MenuKey[] = [
  "detalhes", "usuarios", "eventos", "convidados", "checkin",
  "presentes", "cronograma", "buffet", "playlist", "momentos",
  "estatisticas", "logs"
];

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

const PERMISSION_SHORT: Record<string, string> = {
  view: "Ver",
  add: "Add",
  edit: "Editar",
  delete: "Excluir",
  publish: "Publicar",
};

interface RolePermissionsPopoverProps {
  roleKey: string;
  roleLabel: string;
  isAdmin: boolean;
  badgeVariant: "destructive" | "default" | "secondary" | "outline";
  children: React.ReactNode;
}

const RolePermissionsPopover = ({
  roleKey,
  roleLabel,
  isAdmin,
  badgeVariant,
  children,
}: RolePermissionsPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (open && roleKey !== "admin") {
      fetchPermissions();
    }
  }, [open, roleKey]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("role_key", roleKey);

      if (error) throw error;

      const map: Record<string, Record<string, boolean>> = {};
      (data || []).forEach((p) => {
        map[p.menu_key] = {
          view: p.can_view,
          add: p.can_add,
          edit: p.can_edit,
          delete: p.can_delete,
          publish: p.can_publish,
        };
      });
      setPermissions(map);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Admin badge is not clickable for non-admin users
  if (roleKey === "admin" && !isAdmin) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer hover:opacity-80 transition-opacity">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[400px] overflow-y-auto p-0" align="start">
        <div className="p-3 border-b bg-muted/50">
          <p className="font-semibold text-sm">Permissões: {roleLabel}</p>
          {roleKey === "admin" && (
            <p className="text-xs text-muted-foreground mt-1">
              Administradores possuem todas as permissões automaticamente.
            </p>
          )}
        </div>

        {roleKey === "admin" ? (
          <div className="p-3">
            <p className="text-xs text-muted-foreground">Acesso total a todos os menus e funcionalidades.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y">
            {MENU_ORDER.map((menuKey) => {
              const menuPerms = permissions[menuKey];
              const available = MENU_PERMISSIONS[menuKey];
              const hasView = menuPerms?.view || false;

              return (
                <div key={menuKey} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{MENU_LABELS[menuKey]}</span>
                    {hasView ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                  {hasView && available.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {available
                        .filter((p) => p !== "view")
                        .map((permType) => {
                          const enabled = menuPerms?.[permType] || false;
                          return (
                            <Badge
                              key={permType}
                              variant={enabled ? "default" : "outline"}
                              className={`text-[10px] px-1.5 py-0 ${!enabled ? "opacity-40" : ""}`}
                            >
                              {PERMISSION_SHORT[permType]}
                            </Badge>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default RolePermissionsPopover;
