import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWedding } from "@/contexts/WeddingContext";
import NotFound from "@/pages/NotFound";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, MessageCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

// URL oficial de contato (mesma utilizada em /casamento).
const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5562992485994&text=Olá,%20Quero%20converter%20minha%20demonstração%20em%20uma%20licença%20completa.&type=phone_number&app_absent=0";

const DemoExpiredScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <Card className="max-w-lg w-full p-8 text-center space-y-6">
      <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Clock className="w-7 h-7 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        <h1 className="text-2xl font-serif font-semibold">
          Esta demonstração expirou.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Entre em contato com nossa equipe para converter este evento em uma
          licença completa e continuar exatamente de onde parou. Todos os dados
          (convidados, presentes, fotos, RSVPs, cronograma) permanecem
          preservados.
        </p>
      </div>
      <Button
        size="lg"
        className="gap-2 w-full sm:w-auto"
        onClick={() => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")}
      >
        <MessageCircle className="w-5 h-5" />
        Falar no WhatsApp
      </Button>
    </Card>
  </div>
);

const TenantAdminGuard = ({ children }: Props) => {
  const { loading, error, weddingId, wedding } = useWedding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando painel...</p>
      </div>
    );
  }

  if (error === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  if (error === "access_denied") {
    return <Navigate to="/acesso-negado" replace />;
  }

  if (
    error === "not_found" ||
    error === "invalid_event_type" ||
    error === "reserved_slug" ||
    error === "missing_slug" ||
    !weddingId
  ) {
    return <NotFound />;
  }

  // Bloqueio único: demo expirada (is_demo=true + tenant_status='archived').
  // Preserva todos os dados; apenas impede o uso administrativo.
  if (wedding?.is_demo && wedding?.tenant_status === "archived") {
    return <DemoExpiredScreen />;
  }

  return <>{children}</>;
};

export default TenantAdminGuard;
