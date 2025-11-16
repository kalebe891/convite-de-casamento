import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";

const Buffet = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Gestão do Buffet</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o menu, restrições alimentares e preferências dos convidados
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>Configuração do Buffet</CardTitle>
              <CardDescription>
                Em breve: gestão completa do menu e restrições alimentares
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

export default Buffet;
