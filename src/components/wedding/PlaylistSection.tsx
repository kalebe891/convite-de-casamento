import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";

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
  const [songs, setSongs] = useState<PlaylistSong[]>([]);

  useEffect(() => {
    if (!weddingId) return;

    const fetchPlaylistSongs = async () => {
      const { data } = await supabase
        .from("playlist_songs")
        .select("*")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("display_order");

      setSongs(data || []);
    };

    fetchPlaylistSongs();
  }, [weddingId]);

  if (!weddingId || songs.length === 0) return null;

  // Group songs by moment
  const groupedSongs = songs.reduce((acc, song) => {
    const moment = song.moment || "Outros";
    if (!acc[moment]) {
      acc[moment] = [];
    }
    acc[moment].push(song);
    return acc;
  }, {} as Record<string, PlaylistSong[]>);

  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <Music className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-4xl font-serif font-bold mb-2">Playlist</h2>
          <p className="text-muted-foreground">Músicas especiais do nosso dia</p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedSongs).map(([moment, momentSongs]) => (
            <Card key={moment} className="shadow-elegant">
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlaylistSection;
