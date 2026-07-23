/**
 * Edge SEO Renderer — Etapa 1.25.7
 *
 * Renderer puro: recebe um HTML base + dados SEO já resolvidos e retorna
 * um HTML com o bloco de metatags inserido em uma região delimitada.
 *
 * Sem dependências de:
 *  - React / react-helmet-async
 *  - DOM / window / document
 *  - Supabase / rede / banco
 *  - Cloudflare runtime
 *
 * Reutiliza a camada isomórfica em `src/lib/seo/` (tipos e regras de SEO).
 */
import {
  buildTenantSeo,
  type TenantSeo,
  type WeddingSeoInput,
} from "../../../src/lib/seo/tenantSeo";
import { SITE_URL } from "../../../src/lib/seo/siteUrl";

/** Marcadores da região controlada onde o bloco SEO é escrito/reescrito. */
export const SEO_BLOCK_START = "<!--LOVABLE_SEO_START-->";
export const SEO_BLOCK_END = "<!--LOVABLE_SEO_END-->";

/**
 * Entrada do renderer. Todos os valores já resolvidos (absolutos, quando aplicável).
 * O renderer NÃO faz normalização de URL nem busca dados externos.
 */
export interface RenderSeoInput {
  title: string;
  description: string;
  /** URL absoluta canônica da página. */
  canonical: string;
  /** URL absoluta para og:url (pode ser igual ao canonical). */
  ogUrl: string;
  /** og:type — default "website". */
  ogType?: string;
  /** URL absoluta da imagem social ou null se ausente. */
  image?: string | null;
  /** twitter:card — default "summary_large_image". */
  twitterCard?: "summary" | "summary_large_image";
}

/**
 * Escapa valores para uso seguro em contexto HTML/atributo.
 * Cobre: & < > " '.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gera o bloco SEO delimitado. Idempotente: dado o mesmo input, o output é
 * byte-a-byte idêntico. Valores ausentes NÃO produzem tags com "undefined"
 * ou atributos inválidos — as tags correspondentes são omitidas.
 */
export function renderSeoBlock(input: RenderSeoInput): string {
  const parts: string[] = [SEO_BLOCK_START];

  const title = typeof input.title === "string" ? input.title : "";
  const description = typeof input.description === "string" ? input.description : "";
  const canonical = typeof input.canonical === "string" ? input.canonical : "";
  const ogUrl = typeof input.ogUrl === "string" ? input.ogUrl : "";
  const ogType = typeof input.ogType === "string" && input.ogType ? input.ogType : "website";
  const image = typeof input.image === "string" && input.image ? input.image : null;
  const twitterCard =
    input.twitterCard === "summary" || input.twitterCard === "summary_large_image"
      ? input.twitterCard
      : "summary_large_image";

  if (title) parts.push(`<title>${escapeHtml(title)}</title>`);
  if (description) parts.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  if (canonical) parts.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  if (title) parts.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  if (description) parts.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  if (ogUrl) parts.push(`<meta property="og:url" content="${escapeHtml(ogUrl)}" />`);
  parts.push(`<meta property="og:type" content="${escapeHtml(ogType)}" />`);
  if (image) parts.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
  parts.push(`<meta name="twitter:card" content="${escapeHtml(twitterCard)}" />`);
  if (title) parts.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  if (description) parts.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  if (image) parts.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);

  parts.push(SEO_BLOCK_END);
  return parts.join("\n");
}

/**
 * Localiza a região delimitada por SEO_BLOCK_START/END no HTML.
 * Usa `indexOf` — sem regex sobre o documento inteiro.
 */
function findExistingBlock(html: string): { start: number; end: number } | null {
  const start = html.indexOf(SEO_BLOCK_START);
  if (start === -1) return null;
  const end = html.indexOf(SEO_BLOCK_END, start + SEO_BLOCK_START.length);
  if (end === -1) return null;
  return { start, end: end + SEO_BLOCK_END.length };
}

/**
 * Insere ou substitui o bloco SEO em uma região controlada do HTML.
 *
 * Estratégia:
 *  1. Se o HTML já contém marcadores SEO_BLOCK_START/END, substitui o
 *     conteúdo entre eles (idempotente e não-duplicador).
 *  2. Caso contrário, insere o bloco imediatamente antes da primeira
 *     ocorrência literal de `</head>` (busca via indexOf, case-insensitive
 *     apenas na detecção da tag; nenhum outro conteúdo é reescrito).
 *  3. Se não houver `</head>`, o HTML é retornado inalterado
 *     (comportamento determinístico e seguro).
 */
export function injectSeoBlock(html: string, block: string): string {
  if (typeof html !== "string") return "";
  const existing = findExistingBlock(html);
  if (existing) {
    return html.slice(0, existing.start) + block + html.slice(existing.end);
  }
  // Detecta </head> sem regex global: usa toLowerCase apenas para localizar.
  const lower = html.toLowerCase();
  const headClose = lower.indexOf("</head>");
  if (headClose === -1) return html;
  return html.slice(0, headClose) + block + "\n" + html.slice(headClose);
}

/**
 * API pública principal: aplica o bloco SEO em um HTML base.
 * Idempotente: chamadas repetidas com o mesmo `seo` produzem o mesmo HTML;
 * chamadas com `seo` diferente substituem o bloco anterior sem duplicar.
 */
export function renderTenantSeo(html: string, seo: RenderSeoInput): string {
  return injectSeoBlock(html, renderSeoBlock(seo));
}

/**
 * Helper opcional que compõe o input do renderer a partir da camada
 * isomórfica `buildTenantSeo()`, resolvendo os paths relativos em URLs
 * absolutas contra `siteUrl`. Reaproveita todas as regras de título/
 * descrição/URL/imagem/event type já existentes.
 */
export function buildRenderInputFromTenant(
  wedding: WeddingSeoInput | null | undefined,
  mainPhotoUrl: string | null | undefined,
  siteUrl: string = SITE_URL,
): RenderSeoInput {
  const seo: TenantSeo = buildTenantSeo(wedding, mainPhotoUrl ?? null);
  const base = siteUrl.replace(/\/$/, "");
  const toAbs = (p: string): string => {
    if (!p) return base + "/";
    if (/^https?:\/\//i.test(p)) return p;
    return base + (p.startsWith("/") ? p : "/" + p);
  };
  const image = seo.image ? toAbs(seo.image) : null;
  const url = toAbs(seo.path);
  return {
    title: seo.title,
    description: seo.description,
    canonical: url,
    ogUrl: url,
    ogType: seo.type,
    image,
    twitterCard: "summary_large_image",
  };
}
