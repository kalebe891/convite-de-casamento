import { useNavigate, useParams } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminNotFound = () => {
  const navigate = useNavigate();
  const { eventType, slug } = useParams();

  const handleBack = () => {
    if (eventType && slug) {
      navigate(`/${eventType}/${slug}/admin`);
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A página que você tentou acessar dentro do painel não existe ou foi movida.
      </p>
      <Button onClick={handleBack} className="mt-2">
        Voltar ao painel
      </Button>
    </div>
  );
};

export default AdminNotFound;
