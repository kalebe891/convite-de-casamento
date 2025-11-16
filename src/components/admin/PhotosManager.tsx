import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload } from "lucide-react";

const PhotosManager = () => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<any[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
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

        setPhotos(photosData || []);
      }
    };

    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        })
        .select()
        .single();

      if (error) throw error;

      setPhotos([...photos, data]);

      toast({
        title: "Success!",
        description: "Photo uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string, photoUrl: string) => {
    try {
      const filePath = photoUrl.split("/").slice(-2).join("/");

      await supabase.storage.from("wedding-photos").remove([filePath]);

      const { error } = await supabase.from("photos").delete().eq("id", id);

      if (error) throw error;

      setPhotos(photos.filter((p) => p.id !== id));

      toast({
        title: "Success!",
        description: "Photo deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete photo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-3xl font-serif flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Upload Photos
          </CardTitle>
          <CardDescription>Add photos to your wedding gallery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="photo-upload">Select Photo</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || !weddingId}
            />
            {!weddingId && (
              <p className="text-sm text-muted-foreground">
                Please create wedding details first before uploading photos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Gallery Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-48 object-cover rounded-lg shadow-soft"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotosManager;
