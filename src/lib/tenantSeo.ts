import { dbToUrl, formatEventTitle, type WeddingLike } from "@/lib/eventType";

type WeddingSeoInput = WeddingLike & {
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
  // Aceita YYYY-MM-DD ou ISO.
  const parts = date.slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return `${d} de ${MONTHS_PT[m - 1]} de ${y}`;
}

function extractCity(venueAddress?: string | null): string | null {
  if (!venueAddress) return null;
  // Heurística simples: pega o segmento antes da UF/CEP.
  const segments = venueAddress.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;
  return segments[segments.length >= 2 ? segments.length - 2 : 0] || null;
}

export function buildTenantSeo(
  wedding: WeddingSeoInput | null | undefined,
  mainPhotoUrl?: string | null
) {
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
  const description = `${descPrefix}Confira nosso convite digital.`;

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
