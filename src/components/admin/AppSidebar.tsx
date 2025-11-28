import { Users, UserCheck, Calendar, UtensilsCrossed, Images, BarChart3, ScrollText, Heart, Music, Gift, CalendarDays } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MenuKey, hasPermission } from "@/lib/permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, role } = useAuth();
  const [visibleItems, setVisibleItems] = useState<typeof allItems>([]);

  const allItems = [
    { title: "Detalhes", url: "/admin/detalhes", icon: Heart, adminOnly: false, menuKey: "detalhes" as MenuKey },
    { title: "Usuários", url: "/admin/usuarios", icon: Users, adminOnly: true, menuKey: "usuarios" as MenuKey },
    { title: "Eventos", url: "/admin/eventos", icon: CalendarDays, adminOnly: true, menuKey: "eventos" as MenuKey },
    { title: "Convidados", url: "/admin/convidados", icon: UserCheck, adminOnly: false, menuKey: "convidados" as MenuKey },
    { title: "Check-in", url: "/admin/checkin", icon: UserCheck, adminOnly: false, menuKey: "checkin" as MenuKey },
    { title: "Presentes", url: "/admin/presentes", icon: Gift, adminOnly: false, menuKey: "presentes" as MenuKey },
    { title: "Cronograma", url: "/admin/cronograma", icon: Calendar, adminOnly: false, menuKey: "cronograma" as MenuKey },
    { title: "Buffet", url: "/admin/buffet", icon: UtensilsCrossed, adminOnly: false, menuKey: "buffet" as MenuKey },
    { title: "Playlist", url: "/admin/playlist", icon: Music, adminOnly: false, menuKey: "playlist" as MenuKey },
    { title: "Momentos", url: "/admin/momentos", icon: Images, adminOnly: false, menuKey: "momentos" as MenuKey },
    { title: "Estatísticas", url: "/admin/estatisticas", icon: BarChart3, adminOnly: false, menuKey: "estatisticas" as MenuKey },
    { title: "Logs", url: "/admin/logs", icon: ScrollText, adminOnly: true, menuKey: "logs" as MenuKey },
  ];

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setVisibleItems([]);
        return;
      }

      // Admins veem todos os itens
      if (role === "admin") {
        setVisibleItems(allItems);
        return;
      }

      // Para outros usuários, verificar permissões
      const itemsWithPermission = await Promise.all(
        allItems.map(async (item) => {
          // Se é adminOnly e não é admin, não mostrar
          if (item.adminOnly) {
            return null;
          }
          
          // Verificar se tem permissão de visualizar
          const canView = await hasPermission(user.id, item.menuKey, "can_view");
          return canView ? item : null;
        })
      );

      setVisibleItems(itemsWithPermission.filter(Boolean) as typeof allItems);
    };

    checkPermissions();
  }, [user, role]);

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Painel Administrativo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className={isCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
