import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { LogOut, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import { useRequireRole } from "@/hooks/useRequireRole";
import { OfflineIndicator } from "@/components/admin/OfflineIndicator";
import { usePermissions } from "@/hooks/usePermissions";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading } = useRequireRole(["admin", "couple", "planner", "cerimonial", "tester"]);
  const { loading: permissionsLoading, initialized } = usePermissions();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (user) {
      // Fetch user profile
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) {
            setUserName(data.full_name);
          } else {
            setUserName(user.email?.split('@')[0] || 'Usuário');
          }
        });
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Desconectado",
      description: "Você saiu com sucesso.",
    });
    navigate("/");
  };

  // CRITICAL: Wait for both auth AND permissions to load
  if (loading || permissionsLoading || !initialized) {
    console.log('⏳ [AdminLayout] Waiting for full initialization:', {
      authLoading: loading,
      permissionsLoading,
      permInit: initialized
    });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando permissões...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <OfflineIndicator />
      <div className="min-h-screen flex w-full bg-gradient-elegant">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-0">
          <header className="h-16 border-b border-border bg-card shadow-soft flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-xl font-serif font-bold">Painel Administrativo</h1>
                  <p className="text-xs text-muted-foreground">Beatriz & Diogo</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {role === "admin" ? "Administrador" : role === "couple" ? "Casal" : "Cerimonialista"}
                </p>
              </div>
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate("/")} size="sm">
                Ver Convite
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
