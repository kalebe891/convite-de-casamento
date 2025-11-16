import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

const Logs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Visualize atividades e eventos do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>Registro de Atividades</CardTitle>
              <CardDescription>
                Em breve: histórico completo de ações e eventos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Módulo em desenvolvimento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
