import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useWedding } from "@/contexts/WeddingContext";
import { logAdminAction } from "@/lib/adminLogger";

interface Props {
  permissions: {
    canView: boolean;
    canEdit: boolean;
  };
}

const WeddingVisibilityForm = ({ permissions }: Props) => {
  const { toast } = useToast();
  const { weddingId } = useWedding();
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [initial, setInitial] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!weddingId) return;
    (async () => {
      const { data } = await supabase
        .from("wedding_details")
        .select("is_public_showcase, is_demo")
        .eq("id", weddingId)
        .maybeSingle();
      const v = !!data?.is_public_showcase;
      setIsPublic(v);
      setInitial(v);
      setIsDemo(!!data?.is_demo);
    })();
  }, [weddingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("wedding_details")
        .update({ is_public_showcase: isPublic })
        .eq("id", weddingId);
      if (error) throw error;

      await logAdminAction({
        action: "update",
        tableName: "wedding_details",
        recordId: weddingId,
        oldData: { is_public_showcase: initial },
        newData: { is_public_showcase: isPublic },
        affectedName: "Visibilidade Pública",
      });

      setInitial(isPublic);
      toast({
        title: "Sucesso!",
        description: isPublic
          ? "Evento agora aparece na vitrine pública."
          : "Evento removido da vitrine pública.",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao salvar visibilidade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visibilidade Pública</CardTitle>
        <CardDescription>
          Controle se este evento aparece na vitrine pública da página inicial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
            <div className="space-y-1">
              <Label htmlFor="showcase-toggle" className="text-base">
                Exibir na página inicial
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, este convite aparece publicamente em{" "}
                <code>/casamento</code> ou <code>/aniversario</code> e pode ser
                encontrado por qualquer visitante.
              </p>
            </div>
            {isDemo ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Switch
                      id="showcase-toggle"
                      checked={false}
                      disabled
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Disponível apenas para eventos licenciados.
                </TooltipContent>
              </Tooltip>
            ) : (
              <Switch
                id="showcase-toggle"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={!permissions.canEdit}
              />
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !permissions.canEdit || isDemo || isPublic === initial}
          >
            {loading
              ? "Salvando..."
              : permissions.canEdit
              ? "Salvar Visibilidade"
              : "Somente Leitura"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default WeddingVisibilityForm;
