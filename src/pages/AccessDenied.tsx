import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Home, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AccessDenied = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Desconectado",
      description: "Você saiu com sucesso.",
    });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-elegant flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant animate-fade-in">
        <CardHeader className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-3xl font-serif font-semibold leading-none tracking-tight">Acesso Negado</h1>
          <CardDescription className="text-base">
            Você não tem permissão para acessar esta página
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Esta área é restrita a usuários com permissões específicas. 
            Entre em contato com um administrador se você acredita que deveria ter acesso.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/")} className="w-full gap-2">
              <Home className="w-4 h-4" />
              Ir para Página Inicial
            </Button>
            
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
