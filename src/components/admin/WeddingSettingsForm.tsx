import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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
    venue_map_url: "",
    couple_message: "",
    show_guest_list_public: false,
    show_rsvp_status_public: false,
    show_timeline_section: true,
    show_buffet_section: true,
    show_playlist_section: true,
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
        venue_map_url: data.venue_map_url || "",
        couple_message: data.couple_message || "",
        show_guest_list_public: data.show_guest_list_public || false,
        show_rsvp_status_public: data.show_rsvp_status_public || false,
        show_timeline_section: data.show_timeline_section ?? true,
        show_buffet_section: data.show_buffet_section ?? true,
        show_playlist_section: data.show_playlist_section ?? true,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("wedding_details")
        .update(formData)
        .eq("id", weddingId);

      if (error) throw error;

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
        <CardTitle>Configurações da Página Pública</CardTitle>
        <CardDescription>
          Configure como os convidados verão seu convite online
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="venue_map_url">URL do Mapa (Google Maps Embed)</Label>
            <Input
              id="venue_map_url"
              placeholder="https://www.google.com/maps/embed?pb=..."
              value={formData.venue_map_url}
              onChange={(e) => setFormData({ ...formData, venue_map_url: e.target.value })}
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
            <p className="text-sm text-muted-foreground">
              Cole o link de incorporação do Google Maps
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="couple_message">Mensagem do Casal</Label>
            <Textarea
              id="couple_message"
              placeholder="Escreva uma mensagem especial para seus convidados..."
              value={formData.couple_message}
              onChange={(e) => setFormData({ ...formData, couple_message: e.target.value })}
              rows={4}
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
          </div>

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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_timeline_section">Exibir Seção Cronograma</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra a seção de cronograma na página pública
                </p>
              </div>
              <Switch
                id="show_timeline_section"
                checked={formData.show_timeline_section}
                onCheckedChange={(checked) => setFormData({ ...formData, show_timeline_section: checked })}
                disabled={!permissions.canPublish}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_buffet_section">Exibir Seção Buffet</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra a seção de buffet na página pública
                </p>
              </div>
              <Switch
                id="show_buffet_section"
                checked={formData.show_buffet_section}
                onCheckedChange={(checked) => setFormData({ ...formData, show_buffet_section: checked })}
                disabled={!permissions.canPublish}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_playlist_section">Exibir Seção Playlist</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra a seção de playlist na página pública
                </p>
              </div>
              <Switch
                id="show_playlist_section"
                checked={formData.show_playlist_section}
                onCheckedChange={(checked) => setFormData({ ...formData, show_playlist_section: checked })}
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
