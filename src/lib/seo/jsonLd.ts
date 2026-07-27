/**
 * Camada isomórfica — construção de blocos JSON-LD (Schema.org).
 *
 * Pura: sem React, DOM, `window` ou `import.meta.env`. Retorna objetos
 * JavaScript simples que o consumidor serializa com `JSON.stringify`.
 *
 * Regra: nenhum campo é preenchido com dado fictício. Campos sem dado
 * real disponível são omitidos (nunca `null`/`undefined` no output).
 */
import { SITE_URL } from "./siteUrl";
import { dbToUrl, formatEventTitle, type WeddingLike } from "./eventType";

/** Objeto JSON-LD genérico (serializável). */
export type JsonLd = Record<string, unknown>;

const SITE_NAME = "Convites Digitais";

/** Remove chaves com valor `undefined`, `null` ou string vazia. */
function compact(obj: Record<string, unknown>): JsonLd {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out;
}

function absoluteUrl(path: string, siteUrl: string = SITE_URL): string {
  const base = siteUrl.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Organization + WebSite da plataforma (página institucional `/`).
 * Somente nome, URL, logo e idioma — nenhum contato, endereço, rede
 * social, avaliação, preço ou fundador é inventado.
 */
export function buildSiteJsonLd(siteUrl: string = SITE_URL): JsonLd {
  const base = siteUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      compact({
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: SITE_NAME,
        url: `${base}/`,
        logo: `${base}/pwa-512x512.png`,
      }),
      compact({
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: SITE_NAME,
        url: `${base}/`,
        inLanguage: "pt-BR",
        publisher: { "@id": `${base}/#organization` },
      }),
    ],
  };
}

export interface WebPageJsonLdInput {
  name: string;
  description: string;
  /** Path absoluto começando com "/" ou URL absoluta. */
  path: string;
  siteUrl?: string;
}

/**
 * WebPage institucional (ex.: `/casamento`, `/aniversario`).
 * Descreve apenas a página real — sem Product, Offer ou AggregateRating,
 * que exigiriam dados comerciais inexistentes.
 */
export function buildWebPageJsonLd({
  name,
  description,
  path,
  siteUrl = SITE_URL,
}: WebPageJsonLdInput): JsonLd {
  const base = siteUrl.replace(/\/+$/, "");
  const url = absoluteUrl(path, base);
  return {
    "@context": "https://schema.org",
    ...compact({
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name,
      description,
      url,
      inLanguage: "pt-BR",
      isPartOf: { "@id": `${base}/#website` },
    }),
  };
}

export interface TenantEventJsonLdInput extends WeddingLike {
  wedding_date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
}

/**
 * Evento público do tenant. Retorna `null` quando os dados mínimos
 * (nome + data real) não existem — nenhum evento fictício é emitido.
 *
 * Campos deliberadamente omitidos por ausência de dado real:
 * horário exato, organizador, preço/oferta, disponibilidade,
 * status de participação e lista de participantes.
 */
export function buildTenantEventJsonLd(
  wedding: TenantEventJsonLdInput | null | undefined,
  options: { canonical: string; image?: string | null } = { canonical: "" }
): JsonLd | null {
  if (!wedding) return null;

  const startDate = wedding.wedding_date?.slice(0, 10);
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;

  const name = formatEventTitle(wedding, "");
  if (!name) return null;

  const url = options.canonical;
  if (!url) return null;

  const isWedding = dbToUrl(wedding.event_type) === "casamento";

  const venueName = wedding.venue_name?.trim() || null;
  const venueAddress = wedding.venue_address?.trim() || null;
  const location = venueName
    ? compact({
        "@type": "Place",
        name: venueName,
        address: venueAddress ?? undefined,
      })
    : venueAddress
      ? { "@type": "Place", address: venueAddress }
      : undefined;

  return {
    "@context": "https://schema.org",
    ...compact({
      "@type": isWedding ? "Event" : "Event",
      name,
      startDate,
      url,
      inLanguage: "pt-BR",
      image: options.image ?? undefined,
      location,
    }),
  };
}
