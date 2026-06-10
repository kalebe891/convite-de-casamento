import { supabase } from "@/integrations/supabase/client";
import type { DbEventType } from "@/lib/eventType";

export interface ShowcaseEvent {
  id: string;
  slug: string;
  event_type: string;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string;
  venue_name: string | null;
  venue_address: string | null;
  theme_id: string;
  main_photo_url: string | null;
}

const PUBLIC_FIELDS =
  "id, slug, event_type, bride_name, groom_name, wedding_date, venue_name, venue_address, theme_id";

/** Limite inicial de carga da vitrine — Etapa 20.7. */
export const SHOWCASE_INITIAL_LIMIT = 24;

/**
 * Lista eventos públicos opt-in (`is_public_showcase = true`) com seleção
 * explícita de colunas. Anexa a URL da foto principal (consulta separada).
 */
export async function fetchShowcaseEvents(
  eventType: DbEventType,
  limit: number = SHOWCASE_INITIAL_LIMIT
): Promise<ShowcaseEvent[]> {
  const today = new Date().toISOString().slice(0, 10);

  // 1) Eventos futuros primeiro (ordem crescente por data).
  const { data: upcoming, error: upErr } = await supabase
    .from("wedding_details")
    .select(PUBLIC_FIELDS)
    .eq("is_public_showcase", true)
    .eq("tenant_status", "active")
    .eq("event_type", eventType)
    .gte("wedding_date", today)
    .order("wedding_date", { ascending: true })
    .limit(limit);

  if (upErr) throw upErr;

  let events = upcoming ?? [];

  // 2) Se não preencher, completa com mais recentes do passado.
  if (events.length < limit) {
    const remaining = limit - events.length;
    const { data: past, error: pastErr } = await supabase
      .from("wedding_details")
      .select(PUBLIC_FIELDS)
      .eq("is_public_showcase", true)
      .eq("tenant_status", "active")
      .eq("event_type", eventType)
      .lt("wedding_date", today)
      .order("wedding_date", { ascending: false })
      .limit(remaining);
    if (pastErr) throw pastErr;
    events = [...events, ...(past ?? [])];
  }

  if (events.length === 0) return [];

  const ids = events.map((e) => e.id);
  const { data: photos } = await supabase
    .from("photos")
    .select("wedding_id, photo_url")
    .in("wedding_id", ids)
    .eq("is_main", true);

  const photoMap = new Map<string, string>();
  (photos ?? []).forEach((p) => {
    if (p.wedding_id && p.photo_url) photoMap.set(p.wedding_id, p.photo_url);
  });

  return events.map((e) => ({
    ...(e as Omit<ShowcaseEvent, "main_photo_url">),
    main_photo_url: photoMap.get(e.id) ?? null,
  }));
}
