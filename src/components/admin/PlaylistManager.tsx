import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { playlistSongSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";

interface PlaylistManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const PlaylistManager = ({ permissions }: PlaylistManagerProps) => {
  const { toast } = useToast();
  const [songs, setSongs] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [showPlaylistSection, setShowPlaylistSection] = useState<boolean>(true);
  const [newSong, setNewSong] = useState({ moment: "", song_name: "", artist: "", is_public: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: wedding } = await supabase
      .from("wedding_details")
      .select("id, show_playlist_section")
      .single();

    if (wedding) {
      setWeddingId(wedding.id);
      setShowPlaylistSection(wedding.show_playlist_section ?? true);
      const { data: songsData } = await supabase
        .from("playlist_songs")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("song_name", { ascending: true });
      setSongs(songsData || []);
    }
  };

  const handleTogglePlaylistSection = async (newValue: boolean) => {
    if (!permissions.canPublish) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para publicar/ocultar seções",
        variant: "destructive",
      });
      return;
    }

    if (!weddingId) return;

    const { error } = await supabase
      .from("wedding_details")
      .update({ show_playlist_section: newValue })
      .eq("id", weddingId);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      toast({
        title: "Atualizado",
        description: `Seção de playlist ${newValue ? 'exibida' : 'oculta'} na página pública`,
      });

      await logAdminAction({
        action: "update",
        tableName: "wedding_details",
        recordId: weddingId,
        newData: { show_playlist_section: newValue },
      });

      setShowPlaylistSection(newValue);
    }
  };

  const handleSave = async () => {
    if (!weddingId) return;

    if (!permissions.canAdd && !editingId) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para adicionar itens",
        variant: "destructive",
      });
      return;
    }

    if (!permissions.canEdit && editingId) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar itens",
        variant: "destructive",
      });
      return;
    }

    // Validate input data
    const validationResult = playlistSongSchema.safeParse({
      song_name: newSong.song_name,
      artist: newSong.artist,
      moment: newSong.moment
    });
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({ title: "Erro de validação", description: firstError.message, variant: "destructive" });
      return;
    }

    if (editingId) {
      // Update existing song
      const oldSong = songs.find(s => s.id === editingId);
      const { error } = await supabase
        .from("playlist_songs")
        .update({
          moment: validationResult.data.moment.trim(),
          song_name: validationResult.data.song_name.trim(),
          artist: validationResult.data.artist?.trim() || null,
          is_public: newSong.is_public,
        })
        .eq("id", editingId);

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "update",
          tableName: "playlist_songs",
          recordId: editingId,
          oldData: oldSong,
          newData: newSong,
        });
        toast({ title: "Sucesso", description: "Música atualizada!" });
        setNewSong({ moment: "", song_name: "", artist: "", is_public: true });
        setEditingId(null);
        fetchData();
      }
    } else {
      // Insert new song
      const { data, error } = await supabase.from("playlist_songs").insert({
        wedding_id: weddingId,
        moment: validationResult.data.moment.trim(),
        song_name: validationResult.data.song_name.trim(),
        artist: validationResult.data.artist?.trim() || null,
        is_public: newSong.is_public,
        display_order: songs.length,
      }).select().single();

      if (error) {
        toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        await logAdminAction({
          action: "insert",
          tableName: "playlist_songs",
          recordId: data?.id,
          newData: newSong,
        });
        toast({ title: "Sucesso", description: "Música adicionada!" });
        setNewSong({ moment: "", song_name: "", artist: "", is_public: true });
        fetchData();
      }
    }
  };

  const handleEdit = (song: any) => {
    if (!permissions.canEdit) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar itens",
        variant: "destructive",
      });
      return;
    }
    setEditingId(song.id);
    setNewSong({
      moment: song.moment,
      song_name: song.song_name,
      artist: song.artist || "",
      is_public: song.is_public,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewSong({ moment: "", song_name: "", artist: "", is_public: true });
  };

  const handleDelete = async (id: string) => {
    if (!permissions.canDelete) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir itens",
        variant: "destructive",
      });
      return;
    }
    const deletedSong = songs.find(s => s.id === id);
    const { error } = await supabase.from("playlist_songs").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({
        action: "delete",
        tableName: "playlist_songs",
        recordId: id,
        oldData: deletedSong,
      });
      toast({ title: "Sucesso", description: "Música removida!" });
      fetchData();
    }
  };

  const handleTogglePublic = async (id: string, currentValue: boolean) => {
    if (!permissions.canPublish) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para tornar itens públicos/privados",
        variant: "destructive",
      });
      return;
    }
    const newValue = !currentValue;
    const { error } = await supabase
      .from("playlist_songs")
      .update({ is_public: newValue })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      await logAdminAction({
        action: "update",
        tableName: "playlist_songs",
        recordId: id,
        oldData: { is_public: currentValue },
        newData: { is_public: newValue },
      });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade da Seção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_playlist_section">Exibir Seção na Página Pública</Label>
              <p className="text-sm text-muted-foreground">
                Controla se a seção de playlist aparece na página pública do convite
              </p>
            </div>
            <Switch
              id="show_playlist_section"
              checked={showPlaylistSection}
              onCheckedChange={handleTogglePlaylistSection}
              disabled={!permissions.canPublish}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Música" : "Adicionar Música à Playlist"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Momento</Label>
            <Input
              placeholder="Ex: Entrada dos noivos"
              value={newSong.moment}
              onChange={(e) => setNewSong({ ...newSong, moment: e.target.value })}
              disabled={editingId ? !permissions.canEdit : !permissions.canAdd}
            />
          </div>
          <div>
            <Label>Nome da Música</Label>
            <Input
              placeholder="Ex: Here Comes The Sun"
              value={newSong.song_name}
              onChange={(e) => setNewSong({ ...newSong, song_name: e.target.value })}
              disabled={editingId ? !permissions.canEdit : !permissions.canAdd}
            />
          </div>
          <div>
            <Label>Artista (opcional)</Label>
            <Input
              placeholder="Ex: The Beatles"
              value={newSong.artist}
              onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
              disabled={editingId ? !permissions.canEdit : !permissions.canAdd}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newSong.is_public}
              onCheckedChange={(checked) => setNewSong({ ...newSong, is_public: checked })}
              disabled={!permissions.canPublish}
            />
            <Label>Exibir publicamente</Label>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={!newSong.moment || !newSong.song_name || (editingId ? !permissions.canEdit : !permissions.canAdd)}
            >
              {editingId ? (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Atualizar
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
            {editingId && (
              <Button onClick={handleCancelEdit} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
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
                      disabled={!permissions.canPublish}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(song)}
                      disabled={!permissions.canEdit}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(song.id)}
                      disabled={!permissions.canDelete}
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
