import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConfirmedGuestsSectionProps {
  weddingId: string | null;
}

const ConfirmedGuestsSection = ({ weddingId }: ConfirmedGuestsSectionProps) => {
  const [confirmedGuests, setConfirmedGuests] = useState<any[]>([]);
  const [stats, setStats] = useState({ confirmed: 0, total: 0 });
  const [settings, setSettings] = useState({
    show_guest_list_public: false,
    show_rsvp_status_public: false,
  });

  useEffect(() => {
    if (!weddingId) return;

    const fetchConfirmedGuests = async () => {
      // Buscar configurações de visibilidade
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("show_guest_list_public, show_rsvp_status_public")
        .eq("id", weddingId)
        .single();

      if (weddingData) {
        setSettings({
          show_guest_list_public: weddingData.show_guest_list_public || false,
          show_rsvp_status_public: weddingData.show_rsvp_status_public || false,
        });
      }

      // Buscar convidados confirmados da tabela guests
      const { data: confirmedGuestsData } = await supabase
        .from("guests")
        .select("id, name, email, phone")
        .eq("status", "confirmed")
        .order("name");

      // Buscar total de convidados
      const { data: allGuestsData } = await supabase
        .from("guests")
        .select("id");

      // Transformar dados para o formato esperado
      const formattedGuests = (confirmedGuestsData || []).map(guest => ({
        id: guest.id,
        guest_name: guest.name,
        plus_one: false,
      }));

      setConfirmedGuests(formattedGuests);
      setStats({
        confirmed: confirmedGuestsData?.length || 0,
        total: allGuestsData?.length || 0,
      });
    };

    fetchConfirmedGuests();
  }, [weddingId]);

  // Não mostrar nada se não houver convidados ou se ambas as opções estiverem desabilitadas
  if (stats.total === 0 || (!settings.show_guest_list_public && !settings.show_rsvp_status_public)) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-8 text-foreground">
          Confirmados
        </h2>

        {settings.show_rsvp_status_public && (
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                  <Users className="w-6 h-6 text-primary" />
                  <span>
                    {stats.confirmed} de {stats.total} convidados confirmaram presença
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-primary h-4 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.confirmed / stats.total) * 100}%` }}
                  />
                </div>
                <p className="text-center text-muted-foreground mt-2">
                  {Math.round((stats.confirmed / stats.total) * 100)}% confirmado
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {settings.show_guest_list_public && confirmedGuests.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {confirmedGuests.map((guest, index) => (
                <div
                  key={guest.id}
                  className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-soft animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {guest.guest_name}
                    </p>
                    {guest.plus_one && (
                      <p className="text-sm text-muted-foreground">+1 acompanhante</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ConfirmedGuestsSection;
