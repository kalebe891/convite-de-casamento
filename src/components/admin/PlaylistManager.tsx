import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

const PlaylistManager = () => {
  const { toast } = useToast();
  const [songs, setSongs] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [newSong, setNewSong] = useState({ moment: "", song_name: "", artist: "", is_public: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      const { data: songsData } = await supabase
        .from("playlist_songs")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("display_order");
      setSongs(songsData || []);
    }
  };

  const handleAdd = async () => {
    if (!weddingId || !newSong.moment || !newSong.song_name) return;

    const { error } = await supabase.from("playlist_songs").insert({
      wedding_id: weddingId,
      moment: newSong.moment,
      song_name: newSong.song_name,
      artist: newSong.artist,
      is_public: newSong.is_public,
      display_order: songs.length,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Música adicionada!" });
      setNewSong({ moment: "", song_name: "", artist: "", is_public: true });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("playlist_songs").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Música removida!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("playlist_songs")
      .update({ is_public: !currentValue })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Música à Playlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Momento</Label>
            <Input
              placeholder="Ex: Entrada dos noivos"
              value={newSong.moment}
              onChange={(e) => setNewSong({ ...newSong, moment: e.target.value })}
            />
          </div>
          <div>
            <Label>Nome da Música</Label>
            <Input
              placeholder="Ex: Here Comes The Sun"
              value={newSong.song_name}
              onChange={(e) => setNewSong({ ...newSong, song_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Artista (opcional)</Label>
            <Input
              placeholder="Ex: The Beatles"
              value={newSong.artist}
              onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newSong.is_public}
              onCheckedChange={(checked) => setNewSong({ ...newSong, is_public: checked })}
            />
            <Label>Exibir publicamente</Label>
          </div>
          <Button onClick={handleAdd} disabled={!newSong.moment || !newSong.song_name}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Músicas da Playlist</CardTitle>
        </CardHeader>
        <CardContent>
          {songs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma música adicionada.</p>
          ) : (
            <div className="space-y-4">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{song.moment}</p>
                    <p className="font-semibold">{song.song_name}</p>
                    {song.artist && (
                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={song.is_public}
                      onCheckedChange={() => handleTogglePublic(song.id, song.is_public)}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(song.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default PlaylistManager;
