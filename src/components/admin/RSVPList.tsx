import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Users } from "lucide-react";

const RSVPList = () => {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [stats, setStats] = useState({ attending: 0, notAttending: 0, total: 0 });

  useEffect(() => {
    const fetchRSVPs = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("id")
        .single();

      if (weddingData) {
        const { data: rsvpData } = await supabase
          .from("rsvps")
          .select("*")
          .eq("wedding_id", weddingData.id)
          .order("created_at", { ascending: false });

        if (rsvpData) {
          setRsvps(rsvpData);
          const attending = rsvpData.filter((r) => r.attending).length;
          setStats({
            attending,
            notAttending: rsvpData.length - attending,
            total: rsvpData.length,
          });
        }
      }
    };

    fetchRSVPs();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total RSVPs</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attending</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.attending}</div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Not Attending</CardTitle>
            <XCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.notAttending}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Confirmações de Presença</CardTitle>
          <CardDescription>Visualize todas as respostas dos convidados</CardDescription>
        </CardHeader>
        <CardContent>
          {rsvps.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma confirmação recebida ainda.</p>
          ) : (
            <div className="space-y-4">
              {rsvps.map((rsvp) => (
                <div key={rsvp.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{rsvp.guest_name}</h3>
                      {rsvp.guest_email && (
                        <p className="text-sm text-muted-foreground">{rsvp.guest_email}</p>
                      )}
                      {rsvp.guest_phone && (
                        <p className="text-sm text-muted-foreground">{rsvp.guest_phone}</p>
                      )}
                    </div>
                    <Badge variant={rsvp.attending ? "default" : "secondary"}>
                      {rsvp.attending ? "Confirmado" : "Não Confirmado"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <strong className="text-muted-foreground">Acompanhantes:</strong>
                      <span className="text-foreground">{rsvp.plus_one ? "1" : "0"}</span>
                    </div>
                    {rsvp.dietary_restrictions && (
                      <p className="text-muted-foreground">
                        <strong>Restrições alimentares:</strong> {rsvp.dietary_restrictions}
                      </p>
                    )}
                    {rsvp.message && (
                      <p className="text-muted-foreground mt-2">
                        <strong>Mensagem:</strong> {rsvp.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pt-2">
                      Enviado em: {new Date(rsvp.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RSVPList;
