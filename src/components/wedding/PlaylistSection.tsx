import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useWedding } from "@/contexts/WeddingContext";

interface PlaylistSong {
  id: string;
  song_name: string;
  artist: string | null;
  moment: string;
  is_public: boolean;
  display_order: number;
}

interface PlaylistSectionProps {
  weddingId: string | null;
}

const PlaylistSection = ({ weddingId }: PlaylistSectionProps) => {
  const { wedding } = useWedding();
  const [songs, setSongs] = useState<PlaylistSong[] | null>(null);
  const showSection = wedding?.show_playlist_section ?? true;

  useEffect(() => {
    if (!weddingId) {
      setSongs([]);
      return;
    }
    if (!showSection) {
      setSongs([]);
      return;
    }

    const fetchData = async () => {
      const { data } = await supabase
        .from("playlist_songs")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("display_order");

      setSongs(data || []);
    };

    fetchData();
  }, [weddingId, showSection]);

  if (songs === null) {
    return (
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Skeleton className="w-12 h-12 mx-auto mb-4 rounded" />
            <SkeletonText variant="heading" className="mx-auto max-w-md mb-2" />
            <SkeletonText variant="body" className="mx-auto max-w-xs" />
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} lines={4} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!weddingId || !showSection || songs.length === 0) return null;

  const groupedSongs = songs.reduce((acc, song) => {
    const moment = song.moment || "Outros";
    if (!acc[moment]) acc[moment] = [];
    acc[moment].push(song);
    return acc;
  }, {} as Record<string, PlaylistSong[]>);

  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Music className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-4xl font-serif font-bold mb-2">Playlist</h2>
          <p className="text-muted-foreground">Músicas especiais do nosso dia</p>
        </motion.div>

        <div className="space-y-6">
          {Object.entries(groupedSongs).map(([moment, momentSongs], index) => (
            <motion.div
              key={moment}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">{moment}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {momentSongs.map((song) => (
                      <li key={song.id} className="flex items-start gap-3">
                        <Music className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{song.song_name}</p>
                          {song.artist && (
                            <p className="text-sm text-muted-foreground">{song.artist}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlaylistSection;
