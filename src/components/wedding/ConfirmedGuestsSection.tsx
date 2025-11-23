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

  useEffect(() => {
    if (!weddingId) return;

    const fetchConfirmedGuests = async () => {
      // Buscar confirmações da tabela invitations
      const { data: invitationsData } = await supabase
        .from("invitations")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("attending", true)
        .order("guest_name");

      // Buscar confirmações da tabela rsvps
      const { data: rsvpsData } = await supabase
        .from("rsvps")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("attending", true)
        .order("guest_name");

      const confirmed = [...(invitationsData || []), ...(rsvpsData || [])];
      
      // Buscar total de convidados
      const { data: allInvitations } = await supabase
        .from("invitations")
        .select("id")
        .eq("wedding_id", weddingId);

      const { data: allRsvps } = await supabase
        .from("rsvps")
        .select("id")
        .eq("wedding_id", weddingId);

      setConfirmedGuests(confirmed);
      setStats({
        confirmed: confirmed.length,
        total: (allInvitations?.length || 0) + (allRsvps?.length || 0),
      });
    };

    fetchConfirmedGuests();
  }, [weddingId]);

  if (stats.total === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-8 text-foreground">
          Confirmados
        </h2>

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

        {confirmedGuests.length > 0 && (
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
