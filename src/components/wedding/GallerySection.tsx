import { useState } from "react";

interface GallerySectionProps {
  photos: any[] | null;
}

const GallerySection = ({ photos }: GallerySectionProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Mostrar skeleton enquanto carrega
  if (!photos) {
    return (
      <section className="py-20 bg-gradient-elegant">
        <div className="container mx-auto px-4">
          <div className="h-12 w-64 mx-auto bg-muted/50 rounded-lg animate-pulse mb-16" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-muted/50 rounded-lg animate-pulse"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const displayPhotos = photos
    .filter(p => !p.is_main && !p.is_secondary)
    .map(p => ({ photo_url: p.photo_url, caption: p.caption }));

  return (
    <section className="py-20 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Nossos Momentos
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {displayPhotos.map((photo, index) => (
            <div
              key={index}
              className="aspect-square overflow-hidden rounded-lg shadow-soft hover:shadow-elegant transition-all duration-300 cursor-pointer animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedImage(photo.photo_url)}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || "Gallery photo"}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
            </div>
          ))}
        </div>

        {selectedImage && (
          <div
            className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="Selected"
              className="max-w-full max-h-full rounded-lg shadow-elegant"
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default GallerySection;
