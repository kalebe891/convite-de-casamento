// Helper centralizado para mapeamento de eventType entre URL e banco.
// URL: "casamento" | "aniversario"
// DB:  "wedding"   | "birthday"

export type UrlEventType = "casamento" | "aniversario";
export type DbEventType = "wedding" | "birthday";

const URL_TO_DB: Record<string, DbEventType> = {
  casamento: "wedding",
  aniversario: "birthday",
};

const DB_TO_URL: Record<string, UrlEventType> = {
  wedding: "casamento",
  birthday: "aniversario",
};

export const RESERVED_SLUGS = new Set<string>([
  "admin",
  "auth",
  "login",
  "api",
  "novo",
  "criar",
  "dashboard",
  "settings",
  "configuracoes",
  "convite",
  "convites",
  "casamento",
  "aniversario",
  "static",
]);

export function urlToDb(eventType: string | null | undefined): DbEventType | null {
  if (!eventType) return null;
  return URL_TO_DB[eventType.toLowerCase()] ?? null;
}

export function dbToUrl(eventType: string | null | undefined): UrlEventType | null {
  if (!eventType) return null;
  return DB_TO_URL[eventType.toLowerCase()] ?? null;
}

export function isValidRouteEventType(eventType: string | null | undefined): eventType is UrlEventType {
  return !!eventType && eventType.toLowerCase() in URL_TO_DB;
}

export function isReservedSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

interface WeddingLike {
  slug?: string | null;
  event_type?: string | null;
  bride_name?: string | null;
  groom_name?: string | null;
}

export function buildTenantPublicUrl(wedding: WeddingLike | null | undefined): string | null {
  if (!wedding?.slug) return null;
  const urlType = dbToUrl(wedding.event_type) ?? "casamento";
  return `/${urlType}/${wedding.slug}`;
}

export function buildTenantAdminUrl(wedding: WeddingLike | null | undefined): string | null {
  const base = buildTenantPublicUrl(wedding);
  return base ? `${base}/admin` : null;
}

/** True when a stored name is missing or a placeholder like "A definir". */
export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === "a definir";
}

/**
 * Public display title. Hides placeholder names. Birthdays show only primary.
 */
export function formatEventTitle(
  wedding: WeddingLike | null | undefined,
  fallback = "Evento"
): string {
  if (!wedding) return fallback;
  const primary = isPlaceholderName(wedding.bride_name) ? "" : wedding.bride_name!.trim();
  const secondary = isPlaceholderName(wedding.groom_name) ? "" : wedding.groom_name!.trim();
  if (wedding.event_type === "wedding") {
    if (primary && secondary) return `${primary} & ${secondary}`;
    return primary || secondary || fallback;
  }
  return primary || secondary || fallback;
}
