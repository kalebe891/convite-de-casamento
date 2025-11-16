import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { LogOut, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Fetch user profile
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) {
              setUserName(data.full_name);
            } else {
              setUserName(session.user.email?.split('@')[0] || 'Usuário');
            }
          });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Desconectado",
      description: "Você saiu com sucesso.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-elegant">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card shadow-soft flex items-center justify-between px-6">
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
                <p className="text-xs text-muted-foreground">Administrador</p>
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

          <main className="flex-1 p-6 overflow-auto">
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
