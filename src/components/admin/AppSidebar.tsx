import { Users, UserCheck, Calendar, UtensilsCrossed, Images, BarChart3, ScrollText, Heart, Music, Gift, CalendarDays } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdminBasePath } from "@/hooks/useAdminBasePath";
import { MenuKey } from "@/lib/permissions";

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
  const { role } = useAuth();
  const { hasPermission } = usePermissions();
  const adminBasePath = useAdminBasePath();

  const allItems = [
    { title: "Detalhes", path: "detalhes", icon: Heart, adminOnly: false, menuKey: "detalhes" as MenuKey },
    { title: "Usuários", path: "usuarios", icon: Users, adminOnly: false, menuKey: "usuarios" as MenuKey },
    { title: "Eventos", path: "eventos", icon: CalendarDays, adminOnly: false, menuKey: "eventos" as MenuKey },
    { title: "Convidados", path: "convidados", icon: UserCheck, adminOnly: false, menuKey: "convidados" as MenuKey },
    { title: "Check-in", path: "checkin", icon: UserCheck, adminOnly: false, menuKey: "checkin" as MenuKey },
    { title: "Presentes", path: "presentes", icon: Gift, adminOnly: false, menuKey: "presentes" as MenuKey },
    { title: "Cronograma", path: "cronograma", icon: Calendar, adminOnly: false, menuKey: "cronograma" as MenuKey },
    { title: "Buffet", path: "buffet", icon: UtensilsCrossed, adminOnly: false, menuKey: "buffet" as MenuKey },
    { title: "Playlist", path: "playlist", icon: Music, adminOnly: false, menuKey: "playlist" as MenuKey },
    { title: "Momentos", path: "momentos", icon: Images, adminOnly: false, menuKey: "momentos" as MenuKey },
    { title: "Estatísticas", path: "estatisticas", icon: BarChart3, adminOnly: false, menuKey: "estatisticas" as MenuKey },
    { title: "Logs", path: "logs", icon: ScrollText, adminOnly: false, menuKey: "logs" as MenuKey },
  ];

  const visibleItems = allItems.filter((item) => {
    if (item.adminOnly && role !== "admin") return false;
    return hasPermission(item.menuKey, "view");
  });

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-auto min-w-[180px]"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Painel Administrativo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {adminBasePath === null ? (
              !isCollapsed && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Carregando navegação...
                </p>
              )
            ) : (
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const url = `${adminBasePath}/${item.path}`;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={url}
                          end
                          className="hover:bg-muted/50 whitespace-nowrap"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <item.icon className={isCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4 shrink-0"} />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
