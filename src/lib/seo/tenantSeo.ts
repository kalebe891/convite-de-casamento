/**
 * Camada isomórfica — construção de metadados SEO por tenant.
 * Sem dependência de React/DOM.
 */
import { dbToUrl, formatEventTitle, type WeddingLike } from "./eventType";
import { buildTenantEventJsonLd, type JsonLd } from "./jsonLd";
import { SITE_URL } from "./siteUrl";


export type WeddingSeoInput = WeddingLike & {
  wedding_date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  event_type?: string | null;
};

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatEventDatePt(date?: string | null): string | null {
  if (!date) return null;
  const parts = date.slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return `${d} de ${MONTHS_PT[m - 1]} de ${y}`;
}

function extractCity(venueAddress?: string | null): string | null {
  if (!venueAddress) return null;
  const segments = venueAddress.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;
  return segments[segments.length >= 2 ? segments.length - 2 : 0] || null;
}

export interface TenantSeo {
  title: string;
  description: string;
  path: string;
  image: string | null;
  type: "event";
}

export function buildTenantSeo(
  wedding: WeddingSeoInput | null | undefined,
  mainPhotoUrl?: string | null
): TenantSeo {
  const isWedding = wedding?.event_type === "wedding";
  const baseTitle = formatEventTitle(wedding, "Convite Digital");
  const dateLabel = formatEventDatePt(wedding?.wedding_date);
  const city = extractCity(wedding?.venue_address) || wedding?.venue_name || null;

  const titleSuffix = isWedding ? "Convite de Casamento" : "Convite de Aniversário";
  const title = `${baseTitle} | ${titleSuffix}`;

  const descBits: string[] = [];
  if (dateLabel) descBits.push(dateLabel);
  if (city) descBits.push(city);
  const descPrefix = descBits.length ? `${descBits.join(" • ")}. ` : "";
  // Só cita nomes quando existem de fato (evita repetir o fallback genérico).
  const hasNames = baseTitle !== "Convite Digital";
  const core = hasNames
    ? `Confira o convite digital de ${baseTitle} e confirme sua presença.`
    : "Confira o convite digital do evento e confirme sua presença.";
  const description = `${descPrefix}${core}`;

  const urlType = dbToUrl(wedding?.event_type) ?? "casamento";
  const path = wedding?.slug ? `/${urlType}/${wedding.slug}` : `/${urlType}`;

  return {
    title,
    description,
    path,
    image: mainPhotoUrl ?? null,
    type: "event" as const,
  };
}
