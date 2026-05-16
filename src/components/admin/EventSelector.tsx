import { useWedding } from "@/contexts/WeddingContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

function getEventTypeLabel(type: string | null) {
  switch (type) {
    case "wedding":
      return "Casamento";
    case "birthday":
      return "Aniversário";
    default:
      return "Evento";
  }
}

function formatEventName(w: {
  bride_name?: string | null;
  groom_name?: string | null;
  slug?: string | null;
}) {
  const a = (w.bride_name ?? "").trim();
  const b = (w.groom_name ?? "").trim();
  const undefined1 = !a || a.toLowerCase() === "a definir";
  const undefined2 = !b || b.toLowerCase() === "a definir";
  if (undefined1 && undefined2) return w.slug ?? "Sem nome";
  if (undefined1) return b;
  if (undefined2) return a;
  return `${a} & ${b}`;
}

export default function EventSelector() {
  const { wedding, weddingId, userWeddings, loading, error, setCurrentWedding } =
    useWedding();

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">Carregando evento...</p>
    );
  }

  if (error && userWeddings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Nenhum evento disponível</p>
    );
  }

  // Single event: just show indicator
  if (userWeddings.length <= 1) {
    const w = wedding ?? userWeddings[0]?.wedding ?? null;
    if (!w) {
      return (
        <p className="text-xs text-muted-foreground">Nenhum evento disponível</p>
      );
    }
    return (
      <div className="flex items-center gap-2 text-xs">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <div className="hidden sm:block">
          <span className="text-muted-foreground">Evento ativo: </span>
          <span className="font-medium">{formatEventName(w)}</span>
          <span className="text-muted-foreground">
            {" "}— {getEventTypeLabel(w.event_type ?? null)}
          </span>
        </div>
        <div className="sm:hidden font-medium">{formatEventName(w)}</div>
      </div>
    );
  }

  // Multiple events: dropdown
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="w-4 h-4 text-muted-foreground hidden sm:block" />
      <Select
        value={weddingId ?? undefined}
        onValueChange={(id) => setCurrentWedding(id)}
      >
        <SelectTrigger className="h-8 min-w-[180px] max-w-[260px] text-xs">
          <SelectValue placeholder="Selecionar evento" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          {userWeddings.map((uw) => {
            const w = uw.wedding;
            if (!w) return null;
            return (
              <SelectItem key={uw.wedding_id} value={uw.wedding_id}>
                <span className="font-medium">{formatEventName(w)}</span>
                <span className="text-muted-foreground">
                  {" "}— {getEventTypeLabel(w.event_type ?? null)}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
