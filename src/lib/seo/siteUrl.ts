/**
 * Camada isomórfica de SEO — fonte ÚNICA da URL pública do projeto.
 *
 * Sem dependências de React, DOM, Vite ou browser. Consumível por:
 *  - Frontend React/Vite (via re-export em `src/lib/siteUrl.ts`);
 *  - Cloudflare Worker futuro (Edge Renderer da Etapa 1.25.7+).
 */
export const SITE_URL = "https://convite-de-evento.lovable.app";
export const PUBLIC_SITE_URL = SITE_URL;
