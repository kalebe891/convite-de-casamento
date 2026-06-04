import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Heart, Cake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  buildTenantPublicUrl,
  dbToUrl,
  formatEventTitle,
} from "@/lib/eventType";
import type { ShowcaseEvent } from "@/lib/showcase";

interface Props {
  event: ShowcaseEvent;
}

const ShowcaseCard = ({ event }: Props) => {
  const url =
    buildTenantPublicUrl({
      slug: event.slug,
      event_type: event.event_type,
    }) ?? `/${dbToUrl(event.event_type) ?? "casamento"}/${event.slug}`;

  const title = formatEventTitle(
    {
      bride_name: event.bride_name,
      groom_name: event.groom_name,
      event_type: event.event_type,
    },
    "Evento"
  );

  const date = format(
    new Date(event.wedding_date + "T00:00:00"),
    "dd 'de' MMMM, yyyy",
    { locale: ptBR }
  );

  const Icon = event.event_type === "birthday" ? Cake : Heart;

  return (
    <Link
      to={url}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.25)] bg-card shadow-[0_1px_2px_hsl(0_0%_0%/0.04),0_12px_28px_-10px_hsl(var(--foreground)/0.14)] transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.5)] hover:shadow-[0_2px_4px_hsl(0_0%_0%/0.05),0_18px_40px_-18px_hsl(var(--primary)/0.28)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {event.main_photo_url ? (
          <img
            src={event.main_photo_url}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-elegant">
            <Icon className="h-12 w-12 text-primary/40" />
          </div>
        )}
        {event.theme_id && event.theme_id !== "legacy" && (
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 text-[10px] uppercase tracking-wider"
          >
            {event.theme_id}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary">
          {date}
        </p>
        <h3 className="mt-2 line-clamp-2 font-serif text-xl font-semibold leading-tight">
          {title}
        </h3>
        {event.venue_name && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{event.venue_name}</span>
          </p>
        )}
      </div>
    </Link>
  );
};

export default ShowcaseCard;
