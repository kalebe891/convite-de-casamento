import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://convite-de-evento.lovable.app";

interface SEOProps {
  title: string;
  description: string;
  /** Path absoluto começando com "/". Vira canonical e og:url. */
  path: string;
  image?: string | null;
  type?: "website" | "article" | "event";
  noindex?: boolean;
}

/**
 * SEO — wrapper sobre react-helmet-async. Define title, description,
 * canonical, Open Graph e Twitter Card por rota. Sitewide defaults
 * permanecem em index.html para crawlers que não executam JS.
 */
const SEO = ({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
}: SEOProps) => {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const img = image || `${SITE_URL}/pwa-512x512.png`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
};

export default SEO;
