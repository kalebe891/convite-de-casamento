import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface ConfirmedGuestsSectionProps {
  weddingId: string | null;
}

const ConfirmedGuestsSection = ({ weddingId }: ConfirmedGuestsSectionProps) => {
  const [confirmedGuests, setConfirmedGuests] = useState<any[] | null>(null);
  const [stats, setStats] = useState({ confirmed: 0, total: 0 });
  const [settings, setSettings] = useState({
    show_guest_list_public: false,
    show_rsvp_status_public: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weddingId) {
      setLoading(false);
      return;
    }

    const fetchConfirmedGuests = async () => {
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

      const { data: confirmedGuestsData } = await supabase
        .from("guests")
        .select("id, name, email, phone")
        .eq("status", "confirmed")
        .is("archived_at", null)
        .order("name");

      const { data: allGuestsData } = await supabase
        .from("guests")
        .select("id")
        .is("archived_at", null);

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
      setLoading(false);
    };

    fetchConfirmedGuests();
  }, [weddingId]);

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <SkeletonText variant="heading" className="mx-auto max-w-md" />
          </div>
          <div className="max-w-4xl mx-auto mb-12">
            <SkeletonCard lines={2} />
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (stats.total === 0 || (!settings.show_guest_list_public && !settings.show_rsvp_status_public)) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-5xl font-serif font-bold text-center mb-8 text-foreground"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Confirmados
        </motion.h2>

        {settings.show_rsvp_status_public && (
          <motion.div
            className="max-w-4xl mx-auto mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
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
          </motion.div>
        )}

        {settings.show_guest_list_public && confirmedGuests && confirmedGuests.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {confirmedGuests.map((guest, index) => (
                <motion.div
                  key={guest.id}
                  className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-soft"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
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
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ConfirmedGuestsSection;
