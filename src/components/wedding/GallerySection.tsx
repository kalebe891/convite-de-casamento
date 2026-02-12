import { useState } from "react";
import { SkeletonGallery } from "@/components/ui/skeleton-gallery";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { motion, AnimatePresence } from "framer-motion";

interface GallerySectionProps {
  photos: any[] | null;
}

const GallerySection = ({ photos }: GallerySectionProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!photos) {
    return (
      <section className="py-20 bg-gradient-elegant">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <SkeletonText variant="heading" className="mx-auto max-w-md" />
          </div>
          <div className="max-w-6xl mx-auto">
            <SkeletonGallery columns={4} items={8} />
          </div>
        </div>
      </section>
    );
  }

  if (photos.length === 0) return null;

  const displayPhotos = photos.map(p => ({ photo_url: p.photo_url, caption: p.caption }));

  return (
    <section className="py-20 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-5xl font-serif font-bold text-center mb-16 text-foreground"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Nossos Momentos
        </motion.h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {displayPhotos.map((photo, index) => (
            <motion.div
              key={index}
              className="aspect-square overflow-hidden rounded-lg shadow-soft hover:shadow-elegant transition-all duration-300 cursor-pointer"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              onClick={() => setSelectedImage(photo.photo_url)}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || "Gallery photo"}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {selectedImage && (
            <motion.div
              className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
            >
              <motion.img
                src={selectedImage}
                alt="Selected"
                className="max-w-full max-h-full rounded-lg shadow-elegant"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default GallerySection;
