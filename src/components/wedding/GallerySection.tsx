import { useState } from "react";
import couplePhoto from "@/assets/couple-photo.jpg";
import heroImage from "@/assets/hero-wedding.jpg";

interface GallerySectionProps {
  photos: any[];
}

const GallerySection = ({ photos }: GallerySectionProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const defaultPhotos = [
    { photo_url: couplePhoto, caption: "Golden hour" },
    { photo_url: heroImage, caption: "Beautiful florals" },
    { photo_url: couplePhoto, caption: "Love and laughter" },
    { photo_url: heroImage, caption: "Perfect day" },
  ];

  // Buscar foto secundária
  const secondaryPhoto = photos.find(p => p.is_secondary);
  
  // Filtrar fotos para galeria (excluir principal e secundária)
  const galleryPhotos = photos.filter(p => !p.is_main && !p.is_secondary);
  
  const displayPhotos = galleryPhotos.length > 0 
    ? galleryPhotos.map(p => ({ photo_url: p.photo_url, caption: p.caption }))
    : defaultPhotos;

  return (
    <section className="py-20 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Nossos Momentos
        </h2>
        
        {/* Foto Secundária em Destaque */}
        {secondaryPhoto && (
          <div className="flex justify-center mb-12 animate-fade-in">
            <img
              src={secondaryPhoto.photo_url}
              alt={secondaryPhoto.caption || "Foto secundária do casal"}
              className="rounded-lg shadow-elegant w-full h-auto object-cover max-w-4xl cursor-pointer"
              onClick={() => setSelectedImage(secondaryPhoto.photo_url)}
            />
          </div>
        )}
        
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
