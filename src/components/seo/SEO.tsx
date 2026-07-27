import SeoHead, { SITE_URL } from "./SeoHead";
import { resolvePublicImageUrl } from "@/lib/publicImage";
import type { JsonLd } from "@/lib/seo/jsonLd";

export { SITE_URL };

interface SEOProps {
  title: string;
  description: string;
  /** Path absoluto começando com "/". Convertido em canonical/og:url absolutos. */
  path: string;
  image?: string | null;
  type?: "website" | "article" | "event";
  noindex?: boolean;
  /** Bloco(s) JSON-LD já construídos pela camada `src/lib/seo`. */
  jsonLd?: JsonLd | JsonLd[] | null;
}

/** Resolve `image` do JSON-LD para URL pública absoluta (ou remove o campo). */
function withAbsoluteImage(block: JsonLd): JsonLd {
  const raw = block.image;
  if (typeof raw !== "string") return block;
  const resolved = resolvePublicImageUrl(raw);
  if (!resolved) {
    const { image: _omit, ...rest } = block;
    return rest;
  }
  return { ...block, image: resolved };
}

/**
 * SEO — wrapper legado baseado em `path` relativo. Delega para SeoHead,
 * que é o componente canônico de gerenciamento do <head>.
 *
 * Mantido para não quebrar chamadas existentes (ex.: página pública do
 * tenant, que calcula path dinamicamente via buildTenantSeo).
 */
const SEO = ({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  jsonLd = null,
}: SEOProps) => {
  const canonical = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const blocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  return (
    <SeoHead
      title={title}
      description={description}
      canonical={canonical}
      image={image}
      type={type}
      noIndex={noindex}
      jsonLd={blocks.map(withAbsoluteImage)}
    />
  );
};

export default SEO;
