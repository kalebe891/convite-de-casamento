/**
 * Ponto de entrada da camada isomórfica de SEO.
 *
 * Consumível por:
 *  - Frontend React/Vite (via shims em `src/lib/{siteUrl,eventType,publicImage,tenantSeo}.ts`);
 *  - Cloudflare Worker Edge Renderer (Etapa 1.25.7+), sem trazer React/DOM.
 */
export * from "./siteUrl";
export * from "./eventType";
export * from "./publicImage";
export * from "./tenantSeo";
export * from "./jsonLd";
