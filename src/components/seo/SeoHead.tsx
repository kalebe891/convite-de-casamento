import { Helmet } from "react-helmet-async";
import { resolvePublicImageUrl, DEFAULT_OG_IMAGE } from "@/lib/publicImage";
import { SITE_URL } from "@/lib/siteUrl";
import type { JsonLd } from "@/lib/seo/jsonLd";

/** Reexport para compatibilidade com módulos que importavam SITE_URL daqui. */
export { SITE_URL };

export interface SeoHeadProps {
  title: string;
  description: string;
  /** URL canônica absoluta (obrigatória). Ex: `${SITE_URL}/casamento`. */
  canonical: string;
  /** URL absoluta da imagem para Open Graph / Twitter. */
  image?: string | null;
  /** Tipo Open Graph. Default: "website". */
  type?: "website" | "article" | "event";
  /** Adiciona <meta name="robots" content="noindex,nofollow">. */
  noIndex?: boolean;
  /** Bloco(s) JSON-LD (Schema.org) da rota. Serializados com JSON.stringify. */
  jsonLd?: JsonLd | JsonLd[] | null;
}

/**
 * SeoHead — componente único de gerenciamento do <head> por rota.
 *
 * Renderiza title, description, canonical, Open Graph e Twitter Cards
 * via react-helmet-async. Sem lógica de negócio: apenas mapeia props
 * para meta tags. As tags são deduplicadas pelo Helmet ao trocar de rota,
 * evitando vazamento de metadados antigos no <head>.
 *
 * ---------------------------------------------------------------------------
 * AVISO TÉCNICO IMPORTANTE — Link Preview em redes sociais / mensageiros
 * ---------------------------------------------------------------------------
 * As metatags Open Graph e Twitter Card injetadas aqui são atualizadas no
 * cliente (após a hidratação do React). Isso funciona bem para SEO moderno
 * (Google, Bing) e para crawlers que executam JavaScript.
 *
 * Porém, os scrapers de preview das plataformas abaixo NÃO executam
 * JavaScript e leem apenas o HTML estático servido no primeiro request:
 *
 *   - WhatsApp
 *   - Facebook / Messenger
 *   - Twitter / X
 *   - Telegram
 *   - LinkedIn
 *   - iMessage
 *
 * Portanto, o Link Preview correto por rota NÃO funcionará apenas com este
 * componente. A entrega de metatags específicas no HTML da resposta será
 * implementada na Etapa 1.25.3 (geração estática por rota / snapshot HTML).
 *
 * Este comentário deve permanecer no código para evitar regressões futuras.
 * ---------------------------------------------------------------------------
 */
const SeoHead = ({
  title,
  description,
  canonical,
  image,
  type = "website",
  noIndex = false,
  jsonLd = null,
}: SeoHeadProps) => {
  // `resolvePublicImageUrl` garante URL absoluta (bucket público do Storage
  // ou passthrough se já for absoluta). Fallback institucional absoluto.
  const img = resolvePublicImageUrl(image) ?? DEFAULT_OG_IMAGE;

  const blocks = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).filter(Boolean);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

      {blocks.map((block, i) => (
        // Serialização segura: nunca há interpolação manual de string.
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

export default SeoHead;
