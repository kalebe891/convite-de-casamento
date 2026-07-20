import SeoHead, { SITE_URL } from "./SeoHead";

export { SITE_URL };

interface SEOProps {
  title: string;
  description: string;
  /** Path absoluto começando com "/". Convertido em canonical/og:url absolutos. */
  path: string;
  image?: string | null;
  type?: "website" | "article" | "event";
  noindex?: boolean;
}

/**
 * SEO — wrapper legado baseado em `path` relativo. Delega para SeoHead,
 * que é o componente canônico de gerenciamento do <head>.
 *
 * Mantido para não quebrar chamadas existentes (ex.: página pública do
 * tenant, que calcula path dinamicamente via buildTenantSeo).
 */
const SEO = ({ title, description, path, image, type = "website", noindex = false }: SEOProps) => {
  const canonical = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return (
    <SeoHead
      title={title}
      description={description}
      canonical={canonical}
      image={image}
      type={type}
      noIndex={noindex}
    />
  );
};

export default SEO;
