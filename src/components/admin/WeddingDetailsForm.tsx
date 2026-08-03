import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWedding } from "@/contexts/WeddingContext";
import { devLog } from "@/lib/devLog";

interface WeddingDetailsFormProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const EMPTY_FORM = {
  brideName: "",
  groomName: "",
  weddingDate: "",
  venueName: "",
  story: "",
  coupleMessage: "",
  invitationMessage: "",
};

const WeddingDetailsForm = ({ permissions }: WeddingDetailsFormProps) => {
  const { toast } = useToast();
  const { weddingId, loading: weddingLoading } = useWedding();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    const fetchWeddingDetails = async () => {
      if (!weddingId) {
        setFetching(false);
        return;
      }
      setFetching(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("wedding_details")
        .select("*")
        .eq("id", weddingId)
        .maybeSingle();

      if (error) {
        toast({ title: "Erro", description: "Falha ao carregar detalhes.", variant: "destructive" });
        setFetching(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setFormData(EMPTY_FORM);
        setFetching(false);
        return;
      }

      setFormData({
        brideName: data.bride_name || "",
        groomName: data.groom_name || "",
        weddingDate: data.wedding_date || "",
        venueName: data.venue_name || "",
        story: data.story || "",
        coupleMessage: data.couple_message || "",
        invitationMessage: (data as any).invitation_message || "",
      });
      setFetching(false);
    };

    fetchWeddingDetails();
  }, [weddingId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingId) {
      toast({
        title: "Evento não identificado",
        description: "Não foi possível identificar o evento atual.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const weddingData = {
        bride_name: formData.brideName,
        groom_name: formData.groomName,
        wedding_date: formData.weddingDate,
        venue_name: formData.venueName,
        story: formData.story,
        couple_message: formData.coupleMessage,
        invitation_message: formData.invitationMessage,
      };

      const { data, error } = await supabase
        .from("wedding_details")
        .update(weddingData)
        .eq("id", weddingId)
        .select("*");

      if (error) throw error;

      if (!Array.isArray(data) || data.length === 0) {
        devLog("Operação concluída sem alterações.");
        toast({
          title: "Nenhuma alteração foi aplicada.",
          description: "Verifique suas permissões ou tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const updated = data[0];
      setFormData({
        brideName: updated.bride_name || "",
        groomName: updated.groom_name || "",
        weddingDate: updated.wedding_date || "",
        venueName: updated.venue_name || "",
        story: updated.story || "",
        coupleMessage: updated.couple_message || "",
        invitationMessage: (updated as any).invitation_message || "",
      });

      toast({
        title: "Sucesso!",
        description: "Detalhes salvos. Recarregue a página pública para ver as alterações.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao salvar detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (weddingLoading || fetching) {
    return (
      <Card className="max-w-3xl mx-auto shadow-elegant">
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando detalhes...
        </CardContent>
      </Card>
    );
  }

  if (!weddingId || notFound) {
    return (
      <Card className="max-w-3xl mx-auto shadow-elegant">
        <CardContent className="py-12 text-center text-muted-foreground">
          Não foi possível carregar os detalhes deste evento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-elegant">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brideName">Nome da Noiva</Label>
              <Input
                id="brideName"
                value={formData.brideName}
                onChange={(e) => setFormData({ ...formData, brideName: e.target.value })}
                required
                disabled={!permissions.canEdit}
                readOnly={!permissions.canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groomName">Nome do Noivo</Label>
              <Input
                id="groomName"
                value={formData.groomName}
                onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                required
                disabled={!permissions.canEdit}
                readOnly={!permissions.canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weddingDate">Data do Casamento</Label>
            <Input
              id="weddingDate"
              type="date"
              value={formData.weddingDate}
              onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
              required
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueName">Nome do Local</Label>
            <Input
              id="venueName"
              value={formData.venueName}
              onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">Sua História</Label>
            <Textarea
              id="story"
              value={formData.story}
              onChange={(e) => setFormData({ ...formData, story: e.target.value })}
              rows={6}
              placeholder="Conte a história do casal..."
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupleMessage">Destaque</Label>
            <Textarea
              id="coupleMessage"
              value={formData.coupleMessage}
              onChange={(e) => setFormData({ ...formData, coupleMessage: e.target.value })}
              rows={2}
              placeholder="Ex: Duas almas, um coração"
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitationMessage">Mensagem do Convite (WhatsApp)</Label>
            <Textarea
              id="invitationMessage"
              value={formData.invitationMessage}
              onChange={(e) => setFormData({ ...formData, invitationMessage: e.target.value })}
              rows={6}
              placeholder={`Olá, {guest_name}! 🎉\nEstamos te convidando para o nosso casamento!\nAcesse o link abaixo e confirme sua presença:\n{invitation_link}`}
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Use as variáveis: <code className="bg-muted px-1 rounded">{'{guest_name}'}</code> para o nome do convidado e <code className="bg-muted px-1 rounded">{'{invitation_link}'}</code> para o link do convite.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !permissions.canEdit}>
            {loading ? "Salvando..." : permissions.canEdit ? "Salvar Detalhes" : "Somente Leitura"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default WeddingDetailsForm;
