import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Star } from "lucide-react";
import { getSafeErrorMessage } from "@/lib/errorHandling";

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  display_order: number | null;
  is_main: boolean;
  is_secondary: boolean;
}

interface WeddingPhotosManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const WeddingPhotosManager = ({ permissions }: WeddingPhotosManagerProps) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mainPhoto, setMainPhoto] = useState<Photo | null>(null);
  const [secondaryPhoto, setSecondaryPhoto] = useState<Photo | null>(null);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    const { data: weddingData } = await supabase
      .from("wedding_details")
      .select("id")
      .single();

    if (weddingData) {
      setWeddingId(weddingData.id);

      const { data: photosData } = await supabase
        .from("photos")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .order("display_order");

      if (photosData) {
        setPhotos(photosData);
        setMainPhoto(photosData.find(p => p.is_main) || null);
        setSecondaryPhoto(photosData.find(p => p.is_secondary) || null);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!permissions.canAdd) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para adicionar fotos",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !weddingId) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${weddingId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("wedding-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("wedding-photos")
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("photos")
        .insert({
          wedding_id: weddingId,
          photo_url: publicUrl,
          display_order: photos.length,
          is_main: false,
          is_secondary: false,
        })
        .select()
        .single();

      if (error) throw error;

      setPhotos([...photos, data]);

      toast({
        title: "Sucesso!",
        description: "Foto adicionada com sucesso.",
      });

      // Reset file input
      e.target.value = '';
    } catch (error) {
      toast({
        title: "Erro",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string, photoUrl: string) => {
    if (!permissions.canDelete) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir fotos",
        variant: "destructive",
      });
      return;
    }

    try {
      const filePath = photoUrl.split("/").slice(-2).join("/");

      await supabase.storage.from("wedding-photos").remove([filePath]);

      const { error } = await supabase.from("photos").delete().eq("id", id);

      if (error) throw error;

      const updatedPhotos = photos.filter((p) => p.id !== id);
      setPhotos(updatedPhotos);
      
      if (mainPhoto?.id === id) {
        setMainPhoto(null);
      }
      if (secondaryPhoto?.id === id) {
        setSecondaryPhoto(null);
      }

      toast({
        title: "Sucesso!",
        description: "Foto removida com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSetMainPhoto = async (photoId: string) => {
    if (!permissions.canEdit) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para alterar a foto principal",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("photos")
        .update({ is_main: true })
        .eq("id", photoId);

      if (error) throw error;

      const updatedPhotos = photos.map(p => ({
        ...p,
        is_main: p.id === photoId
      }));
      
      setPhotos(updatedPhotos);
      setMainPhoto(updatedPhotos.find(p => p.id === photoId) || null);

      toast({
        title: "Sucesso!",
        description: "Foto principal atualizada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSetSecondaryPhoto = async (photoId: string) => {
    if (!permissions.canEdit) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para alterar a foto secundária",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("photos")
        .update({ is_secondary: true })
        .eq("id", photoId);

      if (error) throw error;

      const updatedPhotos = photos.map(p => ({
        ...p,
        is_secondary: p.id === photoId
      }));
      
      setPhotos(updatedPhotos);
      setSecondaryPhoto(updatedPhotos.find(p => p.id === photoId) || null);

      toast({
        title: "Sucesso!",
        description: "Foto secundária atualizada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl font-serif flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Adicionar Fotos
          </CardTitle>
          <CardDescription>Faça upload de fotos do casamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="photo-upload">Selecionar Foto</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || !weddingId || !permissions.canAdd}
            />
            {!weddingId && (
              <p className="text-sm text-muted-foreground">
                Por favor, crie os detalhes do casamento primeiro antes de fazer upload de fotos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {mainPhoto && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-2xl font-serif flex items-center gap-2">
              <Star className="w-6 h-6 fill-primary text-primary" />
              Foto Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={mainPhoto.photo_url}
                alt="Foto principal do casamento"
                className="rounded-lg shadow-elegant w-full h-auto object-cover max-w-2xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {secondaryPhoto && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-2xl font-serif flex items-center gap-2">
              <Star className="w-6 h-6 fill-green-600 text-green-600" />
              Foto Secundária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={secondaryPhoto.photo_url}
                alt="Foto secundária do casamento"
                className="rounded-lg shadow-elegant w-full h-auto object-cover"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Galeria de Fotos</CardTitle>
          <CardDescription>
            Clique na estrela amarela para definir como foto principal ou na estrela verde para foto secundária
          </CardDescription>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma foto adicionada ainda.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Foto do casamento"}
                    className="w-full h-48 object-cover rounded-lg shadow-soft"
                  />
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant={photo.is_main ? "default" : "secondary"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSetMainPhoto(photo.id)}
                      title="Definir como foto principal"
                      disabled={!permissions.canEdit}
                    >
                      <Star className={`w-4 h-4 ${photo.is_main ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant={photo.is_secondary ? "default" : "secondary"}
                      size="icon"
                      className="h-8 w-8 bg-green-600 hover:bg-green-700"
                      onClick={() => handleSetSecondaryPhoto(photo.id)}
                      title="Definir como foto secundária"
                      disabled={!permissions.canEdit}
                    >
                      <Star className={`w-4 h-4 ${photo.is_secondary ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                      title="Remover foto"
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

export default WeddingPhotosManager;
