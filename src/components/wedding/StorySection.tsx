import couplePhoto from "@/assets/couple-photo.jpg";

interface StorySectionProps {
  weddingDetails: any;
}

const StorySection = ({ weddingDetails }: StorySectionProps) => {
  return (
    <section className="py-20 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          Our Story
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <img
              src={couplePhoto}
              alt="Couple"
              className="rounded-lg shadow-elegant w-full h-auto object-cover"
            />
          </div>
          
          <div className="space-y-6 animate-fade-in-up">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {weddingDetails?.story || 
                "From the moment we met, we knew something special had begun. Through laughter, adventures, and countless memories, our love has grown stronger each day."}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Now, surrounded by our loved ones, we're ready to start the greatest adventure of all – spending forever together.
            </p>
            <div className="pt-6">
              <p className="text-2xl font-serif text-foreground italic">
                "Two souls, one heart"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StorySection;
