import PlaylistManager from "@/components/admin/PlaylistManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Playlist = () => {
  const permissions = usePagePermissions("playlist");

  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Playlist da Cerimônia</h1>
        <p className="text-muted-foreground mt-2">
          Escolha as músicas especiais para cada momento
        </p>
      </div>
      <PlaylistManager permissions={permissions} />
    </div>
  );
};

export default Playlist;
