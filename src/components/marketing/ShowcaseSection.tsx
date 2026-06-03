import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  fetchShowcaseEvents,
  SHOWCASE_INITIAL_LIMIT,
  type ShowcaseEvent,
} from "@/lib/showcase";
import type { DbEventType } from "@/lib/eventType";
import ShowcaseCard from "./ShowcaseCard";
import { formatEventTitle } from "@/lib/eventType";

interface Props {
  eventType: DbEventType;
  title?: string;
  subtitle?: string;
}

const PAGE_STEP = 8;

const ShowcaseSection = ({
  eventType,
  title = "Eventos em destaque",
  subtitle = "Convites publicados pelos próprios anfitriões.",
}: Props) => {
  const [events, setEvents] = useState<ShowcaseEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_STEP);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setError(null);
    fetchShowcaseEvents(eventType, SHOWCASE_INITIAL_LIMIT)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os eventos no momento.");
      });
    return () => {
      cancelled = true;
    };
  }, [eventType]);

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const title = formatEventTitle(
        {
          bride_name: e.bride_name,
          groom_name: e.groom_name,
          event_type: e.event_type,
        },
        ""
      ).toLowerCase();
      return (
        title.includes(q) ||
        (e.bride_name ?? "").toLowerCase().includes(q) ||
        (e.groom_name ?? "").toLowerCase().includes(q) ||
        (e.venue_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, query]);

  const shown = filtered.slice(0, visible);
  const canLoadMore = filtered.length > visible;

  return (
    <section className="border-t border-border/40 bg-muted/20 py-16 sm:py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Vitrine</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        </div>

        <div className="mx-auto mb-8 flex max-w-md items-center gap-2 rounded-xl border border-border/60 bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou anfitrião..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        {error && (
          <p className="text-center text-sm text-muted-foreground">{error}</p>
        )}

        {!error && events === null && (
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} showImage lines={1} />
            ))}
          </div>
        )}

        {!error && events !== null && shown.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {query
              ? "Nenhum evento corresponde à busca."
              : "Ainda não há eventos publicados nesta categoria."}
          </p>
        )}

        {shown.length > 0 && (
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((e) => (
              <ShowcaseCard key={e.id} event={e} />
            ))}
          </div>
        )}

        {canLoadMore && (
          <div className="mt-10 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setVisible((v) => v + PAGE_STEP)}
            >
              <Loader2 className="mr-2 h-4 w-4 opacity-0" />
              Carregar mais
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ShowcaseSection;
