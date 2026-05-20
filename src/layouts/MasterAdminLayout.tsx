import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

/**
 * Layout dedicado do Master Admin global (/admin).
 *
 * IMPORTANTE:
 * - NÃO usa WeddingProvider.
 * - NÃO depende de useWedding, weddingId nem active_wedding_id.
 * - NÃO renderiza EventSelector ou sidebar de tenant.
 */
const MasterAdminLayout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setUserName(data?.full_name || user.email?.split("@")[0] || "Admin");
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Desconectado", description: "Você saiu com sucesso." });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-elegant">
      <header className="h-16 border-b border-border bg-card shadow-soft flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-serif font-bold leading-tight">Master Admin</h1>
            <p className="text-xs text-muted-foreground">Gestão global da plataforma</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `hidden sm:inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>

          <div className="text-right hidden md:block">
            <p className="text-sm font-medium leading-tight">{userName}</p>
            <p className="text-xs text-muted-foreground">Administrador global</p>
          </div>
          <ThemeToggle />
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
  );
};

export default MasterAdminLayout;
