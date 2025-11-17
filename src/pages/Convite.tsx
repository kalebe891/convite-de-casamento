import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeToggle from "@/components/ThemeToggle";
import { Heart, MapPin, Calendar, Clock } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Convite = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [weddingData, setWeddingData] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [buffet, setBuffet] = useState<any[]>([]);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [guestList, setGuestList] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch wedding details
        const { data: wedding, error: weddingError } = await supabase
          .from("wedding_details")
          .select("*")
          .eq("id", id)
          .single();

        if (weddingError) throw weddingError;
        setWeddingData(wedding);

        // Fetch photos
        const { data: photosData } = await supabase
          .from("photos")
          .select("*")
          .eq("wedding_id", id)
          .order("display_order");
        setPhotos(photosData || []);

        // Fetch timeline
        const { data: timelineData } = await supabase
          .from("timeline_events")
          .select("*")
          .eq("wedding_id", id)
          .eq("is_public", true)
          .order("display_order");
        setTimeline(timelineData || []);

        // Fetch buffet
        const { data: buffetData } = await supabase
          .from("buffet_items")
          .select("*")
          .eq("wedding_id", id)
          .eq("is_public", true)
          .order("display_order");
        setBuffet(buffetData || []);

        // Fetch playlist
        const { data: playlistData } = await supabase
          .from("playlist_songs")
          .select("*")
          .eq("wedding_id", id)
          .eq("is_public", true)
          .order("display_order");
        setPlaylist(playlistData || []);

        // Fetch guest list if public
        if (wedding?.show_guest_list_public) {
          const { data: guestsData } = await supabase
            .from("invitations")
            .select("guest_name, attending, responded_at")
            .eq("wedding_id", id)
            .order("guest_name");
          setGuestList(guestsData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!weddingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Convite não encontrado.</p>
      </div>
    );
  }

  const weddingDate = new Date(weddingData.wedding_date);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-background">
        <div className="text-center space-y-6 px-4">
          <Heart className="w-16 h-16 mx-auto text-primary animate-pulse" />
          <h1 className="text-5xl md:text-7xl font-serif font-bold">
            {weddingData.bride_name} & {weddingData.groom_name}
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground">
            {format(weddingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {weddingData.couple_message && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto italic">
              "{weddingData.couple_message}"
            </p>
          )}
          <Button size="lg" className="mt-8" onClick={() => window.location.href = `/rsvp?invitation=${id}`}>
            <Heart className="w-5 h-5 mr-2" />
            Confirmar Presença
          </Button>
        </div>
      </section>

      {/* Photos Gallery */}
      {photos.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-serif font-bold text-center mb-12">Nossos Momentos</h2>
            <Carousel className="w-full">
              <CarouselContent>
                {photos.map((photo) => (
                  <CarouselItem key={photo.id}>
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || "Foto do casal"}
                        className="w-full h-full object-cover"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                          <p className="text-white text-center">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </section>
      )}

      {/* Location */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-serif font-bold text-center mb-12">Local da Cerimônia</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">{weddingData.venue_name}</h3>
                  <p className="text-muted-foreground">{weddingData.venue_address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary" />
                <p>{format(weddingDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
              {weddingData.venue_map_url && (
                <div className="mt-4">
                  <iframe
                    src={weddingData.venue_map_url}
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    className="rounded-lg"
                  ></iframe>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-serif font-bold text-center mb-12">Cronograma</h2>
            <div className="space-y-4">
              {timeline.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-6 flex items-start gap-4">
                    <Clock className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-semibold text-lg">{event.time}</p>
                      <p className="text-muted-foreground">{event.activity}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Buffet */}
      {buffet.length > 0 && (
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-serif font-bold text-center mb-12">Cardápio</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {buffet.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{item.item_name}</h3>
                    {item.category && (
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Playlist */}
      {playlist.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-serif font-bold text-center mb-12">Playlist da Cerimônia</h2>
            <div className="space-y-4">
              {playlist.map((song) => (
                <Card key={song.id}>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-1">{song.moment}</p>
                    <h3 className="font-semibold text-lg">{song.song_name}</h3>
                    {song.artist && <p className="text-muted-foreground">{song.artist}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Guest List */}
      {weddingData.show_guest_list_public && guestList.length > 0 && (
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-serif font-bold text-center mb-12">Lista de Convidados</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guestList.map((guest, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <p className="font-medium">{guest.guest_name}</p>
                    {weddingData.show_rsvp_status_public && guest.responded_at && (
                      <p className="text-sm text-muted-foreground">
                        {guest.attending ? "✓ Confirmado" : "✗ Não comparecerá"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Story Section */}
      {weddingData.story && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-serif font-bold text-center mb-12">Nossa História</h2>
            <Card>
              <CardContent className="p-8">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{weddingData.story}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto text-center">
          <Heart className="w-8 h-8 mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">
            {weddingData.bride_name} & {weddingData.groom_name}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {format(weddingDate, "dd.MM.yyyy", { locale: ptBR })}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Convite;
