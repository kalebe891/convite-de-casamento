import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";

interface WeddingSettingsFormProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const WeddingSettingsForm = ({ permissions }: WeddingSettingsFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    show_guest_list_public: false,
    show_rsvp_status_public: false,
  });

  useEffect(() => {
    fetchWeddingDetails();
  }, []);

  const fetchWeddingDetails = async () => {
    const { data, error } = await supabase
      .from("wedding_details")
      .select("*")
      .single();

    if (data) {
      setWeddingId(data.id);
      setFormData({
        show_guest_list_public: data.show_guest_list_public || false,
        show_rsvp_status_public: data.show_rsvp_status_public || false,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current values for logging
      const { data: currentData } = await supabase
        .from("wedding_details")
        .select("show_guest_list_public, show_rsvp_status_public")
        .eq("id", weddingId)
        .single();

      const { error } = await supabase
        .from("wedding_details")
        .update(formData)
        .eq("id", weddingId);

      if (error) throw error;

      // Log the toggle changes
      if (weddingId) {
        await logAdminAction({
          action: "update",
          tableName: "wedding_details",
          recordId: weddingId,
          oldData: currentData,
          newData: formData,
        });
      }

      toast({
        title: "Sucesso!",
        description: "Configurações atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de visibilidade de Convidados</CardTitle>
        <CardDescription>
          Configure exibição dos convidados na pagina inicial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_guest_list_public">Exibir Lista de Convidados Publicamente</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra os nomes dos convidados confirmados na página pública
                </p>
              </div>
              <Switch
                id="show_guest_list_public"
                checked={formData.show_guest_list_public}
                onCheckedChange={(checked) => setFormData({ ...formData, show_guest_list_public: checked })}
                disabled={!permissions.canPublish}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_rsvp_status_public">Exibir Status de Confirmação Publicamente</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra estatísticas de confirmação (porcentagem e progresso) na página pública
                </p>
              </div>
              <Switch
                id="show_rsvp_status_public"
                checked={formData.show_rsvp_status_public}
                onCheckedChange={(checked) => setFormData({ ...formData, show_rsvp_status_public: checked })}
                disabled={!permissions.canPublish}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading || !permissions.canEdit}>
            {loading ? "Salvando..." : permissions.canEdit ? "Salvar Configurações" : "Somente Leitura"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default WeddingSettingsForm;
