import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ExternalLink, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

interface GiftsSectionProps {
  weddingId: string | null;
}

interface GiftItem {
  id: string;
  gift_name: string;
  description: string | null;
  link: string | null;
  is_purchased: boolean | null;
  is_public: boolean | null;
  selected_by_guest_id: string | null;
}

const ITEMS_PER_PAGE = { mobile: 8, tablet: 12, desktop: 16 };

const GiftCardSkeleton = ({ index }: { index: number }) => (
  <div
    className="rounded-2xl bg-card border border-border p-5 space-y-3"
  >
    <div className="flex items-center gap-2.5">
      <Skeleton className="w-5 h-5 rounded-full" />
      <Skeleton className="h-5 w-3/4 rounded" />
    </div>
    <Skeleton className="h-4 w-full rounded" />
    <Skeleton className="h-4 w-2/3 rounded" />
    <Skeleton className="h-11 w-full rounded-xl" />
  </div>
);

const GiftCard = ({ gift, index }: { gift: GiftItem; index: number }) => {
  const isReserved = !!gift.selected_by_guest_id || !!gift.is_purchased;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Card
        className={`group rounded-2xl border border-border shadow-soft transition-all duration-300
          hover:shadow-elegant hover:-translate-y-1
          ${isReserved ? "opacity-60" : ""}
        `}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base leading-snug truncate">{gift.gift_name}</CardTitle>
            </div>
            {isReserved && (
              <Check className="w-4 h-4 flex-shrink-0 text-green-600" />
            )}
          </div>
          {gift.description && (
            <CardDescription className="mt-2 text-sm leading-relaxed line-clamp-2">
              {gift.description}
            </CardDescription>
          )}
        </CardHeader>
        {gift.link && (
          <CardContent className="pt-1">
            <Button
              variant="outline"
              className="w-full rounded-xl h-11 text-sm font-medium transition-all duration-200
                group-hover:border-primary/30 group-hover:text-primary"
              onClick={() => window.open(gift.link!, "_blank")}
              disabled={isReserved}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Presente
            </Button>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
};

const GiftsSection = ({ weddingId }: GiftsSectionProps) => {
  const [allGifts, setAllGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSection, setShowSection] = useState(true);
  const [hideReserved, setHideReserved] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE.desktop);
  const isMobile = useIsMobile();

  useEffect(() => {
    const width = window.innerWidth;
    if (width < 768) setVisibleCount(ITEMS_PER_PAGE.mobile);
    else if (width < 1024) setVisibleCount(ITEMS_PER_PAGE.tablet);
    else setVisibleCount(ITEMS_PER_PAGE.desktop);
  }, []);

  const loadMore = useCallback(() => {
    const width = window.innerWidth;
    const increment = width < 768 ? ITEMS_PER_PAGE.mobile : width < 1024 ? ITEMS_PER_PAGE.tablet : ITEMS_PER_PAGE.desktop;
    setVisibleCount((prev) => prev + increment);
  }, []);

  useEffect(() => {
    if (!weddingId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("show_gifts_section, hide_reserved_gifts")
        .eq("id", weddingId)
        .single();

      if (weddingData) {
        setShowSection(weddingData.show_gifts_section ?? true);
        setHideReserved(weddingData.hide_reserved_gifts ?? false);
      }

      const { data, error } = await supabase
        .from("gift_items")
        .select("id, gift_name, description, link, is_purchased, is_public, selected_by_guest_id")
        .eq("wedding_id", weddingId)
        .eq("is_public", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching gifts:", error);
      } else {
        let filtered = data || [];
        if (weddingData?.hide_reserved_gifts) {
          filtered = filtered.filter((g) => !g.selected_by_guest_id);
        }
        setAllGifts(filtered);
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("public-gifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "gift_items", filter: `wedding_id=eq.${weddingId}` }, () => fetchData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wedding_details", filter: `id=eq.${weddingId}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [weddingId]);

  if (!showSection) return null;

  const visibleGifts = allGifts.slice(0, visibleCount);
  const hasMore = visibleCount < allGifts.length;
  const skeletonCount = isMobile ? 4 : 8;

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {loading ? (
          <>
            <div className="text-center mb-10 sm:mb-12">
              <Skeleton className="h-10 sm:h-12 w-56 sm:w-72 mx-auto rounded-lg mb-4" />
              <Skeleton className="h-5 w-64 sm:w-96 mx-auto rounded" />
            </div>
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <GiftCardSkeleton key={i} index={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <motion.div
              className="text-center mb-10 sm:mb-14"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold mb-3 sm:mb-4 text-foreground">
                Lista de Presentes
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {allGifts.length === 0
                  ? "Ainda não há presentes cadastrados"
                  : "Se você deseja nos presentear, aqui estão algumas sugestões especiais"}
              </p>
            </motion.div>

            {allGifts.length > 0 && (
              <>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                  {visibleGifts.map((gift, index) => (
                    <GiftCard key={gift.id} gift={gift} index={index} />
                  ))}
                </div>

                {hasMore && (
                  <motion.div
                    className="flex justify-center mt-10 sm:mt-14"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={loadMore}
                      className="rounded-full px-8 h-12 text-sm font-medium border-primary/30 text-primary
                        hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
                    >
                      Ver mais presentes
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default GiftsSection;
