import { Users, UserCheck, Calendar, UtensilsCrossed, Images, BarChart3, ScrollText, Heart, Music, Gift } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        setIsAdmin(data || false);
      }
    };
    checkAdminRole();
  }, []);

  const allItems = [
    { title: "Detalhes", url: "/admin/detalhes", icon: Heart, adminOnly: false },
    { title: "Usuários", url: "/admin/usuarios", icon: Users, adminOnly: true },
    { title: "Convidados", url: "/admin/convidados", icon: UserCheck, adminOnly: false },
    { title: "Check-in", url: "/admin/checkin", icon: UserCheck, adminOnly: false },
    { title: "Presentes", url: "/admin/presentes", icon: Gift, adminOnly: false },
    { title: "Cronograma", url: "/admin/cronograma", icon: Calendar, adminOnly: false },
    { title: "Buffet", url: "/admin/buffet", icon: UtensilsCrossed, adminOnly: false },
    { title: "Playlist", url: "/admin/playlist", icon: Music, adminOnly: false },
    { title: "Momentos", url: "/admin/momentos", icon: Images, adminOnly: false },
    { title: "Estatísticas", url: "/admin/estatisticas", icon: BarChart3, adminOnly: false },
    { title: "Logs", url: "/admin/logs", icon: ScrollText, adminOnly: true },
  ];

  const items = allItems.filter(item => !item.adminOnly || isAdmin);
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
              {items.map((item) => (
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
