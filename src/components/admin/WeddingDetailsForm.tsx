import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface WeddingDetailsFormProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const WeddingDetailsForm = ({ permissions }: WeddingDetailsFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    brideName: "Beatriz de Oliveira",
    groomName: "Diogo Martins",
    weddingDate: "2026-04-18",
    venueName: "Espaço Verde Eventos",
    venueAddress: "Alameda Santana, Qd.102 - Lt.01 - Cardoso Continuação, Aparecida de Goiânia - GO",
    story: "",
  });

  useEffect(() => {
    const fetchWeddingDetails = async () => {
      const { data } = await supabase
        .from("wedding_details")
        .select("*")
        .single();

      if (data) {
        setWeddingId(data.id);
        setFormData({
          brideName: data.bride_name || "",
          groomName: data.groom_name || "",
          weddingDate: data.wedding_date || "",
          venueName: data.venue_name || "",
          venueAddress: data.venue_address || "",
          story: data.story || "",
        });
      }
    };

    fetchWeddingDetails();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const weddingData = {
        bride_name: formData.brideName,
        groom_name: formData.groomName,
        wedding_date: formData.weddingDate,
        venue_name: formData.venueName,
        venue_address: formData.venueAddress,
        story: formData.story,
      };

      if (weddingId) {
        const { error } = await supabase
          .from("wedding_details")
          .update(weddingData)
          .eq("id", weddingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("wedding_details")
          .insert(weddingData)
          .select()
          .single();

        if (error) throw error;
        if (data) setWeddingId(data.id);
      }

      toast({
        title: "Sucesso!",
        description: "Detalhes do casamento salvos com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar detalhes do casamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto shadow-elegant">
      <CardHeader>
        <CardTitle className="text-3xl font-serif">Detalhes do Casamento</CardTitle>
        <CardDescription>Gerencie as informações do seu casamento</CardDescription>
      </CardHeader>
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
            <Label htmlFor="venueAddress">Endereço do Local</Label>
            <Input
              id="venueAddress"
              value={formData.venueAddress}
              onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
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
              disabled={!permissions.canEdit}
              readOnly={!permissions.canEdit}
            />
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
