import PlaylistManager from "@/components/admin/PlaylistManager";

const Playlist = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Playlist da Cerimônia</h1>
        <p className="text-muted-foreground mt-2">
          Escolha as músicas especiais para cada momento
        </p>
      </div>
      <PlaylistManager />
    </div>
  );
};

export default Playlist;
