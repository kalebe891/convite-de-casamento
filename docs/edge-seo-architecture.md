# Etapa 1.25.4 — Arquitetura-alvo do Link Preview Server-Side

Este documento define a arquitetura para futura implementação de um Edge
Renderer que entregue metatags específicas por tenant a scrapers que não
executam JavaScript (WhatsApp, Facebook, LinkedIn, Telegram, Twitter/X,
iMessage). **Esta etapa não implementa o renderer** — apenas prepara a
arquitetura, o contrato e a estratégia de domínio.

---

## 1. Infraestrutura encontrada

- Hosting: **Lovable Hosting nativo** (SPA estática servindo `index.html`).
- SEO client-side pronto:
  - `src/components/seo/SeoHead.tsx`
  - `src/components/seo/SEO.tsx`
  - `src/lib/tenantSeo.ts`
  - `src/lib/siteUrl.ts` (fonte única de `SITE_URL`)
  - `src/lib/publicImage.ts` (resolução de imagens públicas absolutas)
- Backend: Supabase (Lovable Cloud) com Edge Functions para RSVP, PIX,
  MCP etc.

## 2. Infraestrutura ausente

Nenhum dos seguintes arquivos existe no repositório:

- `wrangler.toml` / `wrangler.json` / `wrangler.jsonc`
- `_worker.js` / `_worker.ts`
- `_middleware.js` / `_middleware.ts`
- `_routes.json`
- `functions/`
- `vercel.json`
- `netlify.toml`

Não há dependências de Cloudflare Workers (`wrangler`, `hono`,
`@cloudflare/*`) em `package.json`. Não existe pipeline de deploy
customizado — o deploy é gerenciado inteiramente pela Lovable.

**Conclusão:** não há hoje camada Edge capaz de interceptar requisições
HTTP antes do hosting. Qualquer renderer Worker escrito agora seria
código morto.

## 3. Arquitetura atual

```text
Scraper / Usuário
      │
      ▼
Lovable Hosting
      │
      ▼
index.html estático (metatags institucionais)
      │
      ▼
React + react-helmet-async (atualiza <head> após hidratação)
```

Limitação: scrapers sem JS leem apenas o HTML estático inicial, portanto
não recebem metatags específicas do tenant.

## 4. Arquitetura futura definida

```text
Scraper / Usuário
      │
      ▼
Domínio público (DNS)
      │
      ▼
Cloudflare Worker (Edge Renderer)
      │
      ├── GET /casamento/:slug   ─┐
      ├── GET /aniversario/:slug ─┤ intercepta, busca dados públicos,
      │                           │ injeta OG tags no HTML e responde
      │                           │
      └── demais rotas ───────────► pass-through para Lovable Hosting
```

Fluxo do renderer:

```text
eventType + slug
      │
      ▼
Consulta pública (REST/PostgREST anon) ao Supabase
      │
      ▼
Dados mínimos de SEO
      │
      ▼
HTML com OG Tags escapadas
      │
      ▼
Resposta ao scraper
```

## 5. Dados necessários para o renderer

Campos públicos consumidos por `eventType + slug`:

- `bride_name` / `celebrant_name`
- `groom_name`
- `event_type`
- `wedding_date`
- `venue_name` / `venue_address`
- foto principal (`photos.is_main = true`)
- `slug`

Fonte: tabelas públicas (`wedding_details`, `photos`) via PostgREST com
a `anon key` já pública, respeitando RLS existente. **Não** usar
`service_role`.

## 6. Lógica reutilizável identificada

Funções puras candidatas a extração futura para uma camada isomórfica
(sem React/DOM):

- `src/lib/eventType.ts` — `urlToDb`, `dbToUrl`, `formatEventTitle`,
  `isPlaceholderName`, `buildTenantPublicUrl`.
- `src/lib/tenantSeo.ts` — `buildTenantSeo`, `formatEventDatePt`.
- `src/lib/publicImage.ts` — `resolvePublicImageUrl`, `DEFAULT_OG_IMAGE`.
- `src/lib/siteUrl.ts` — `SITE_URL`.

Já são compatíveis com Edge (sem `window`/`document`/React). A extração
formal só será feita na etapa de implementação do Worker.

## 7. Dependências incompatíveis com Edge

Não devem ser importadas pelo futuro Worker:

- `react`, `react-dom`
- `react-helmet-async`
- `react-router-dom`
- `@supabase/supabase-js` client browser-oriented (usar `fetch` direto
  contra o endpoint REST público, ou o subset compatível com Workers)
- Qualquer hook (`useEffect`, `useMemo`, `useContext`)
- Componentes em `src/components/**` e `src/pages/**`
- Qualquer acesso a `window`, `document`, `localStorage`

## 8. Estratégia de domínio

- Domínio atual: `https://convite-de-evento.lovable.app` (subdomínio
  Lovable), centralizado em `src/lib/siteUrl.ts`.
- Para habilitar o Edge Renderer será necessário:
  1. Conectar um **domínio próprio** ao projeto (Project Settings →
     Domains) ou manter o subdomínio Lovable como origem.
  2. Colocar **Cloudflare** como DNS/proxy do domínio próprio.
  3. Configurar rota do Worker cobrindo apenas `/casamento/:slug` e
     `/aniversario/:slug`; demais rotas fazem pass-through para a origem
     (Lovable Hosting).
  4. Atualizar `SITE_URL` (ponto único) caso o domínio público mude.

Nenhum domínio adicional deve ser hardcoded fora de `siteUrl.ts`.

## 9. Contrato do futuro Renderer

**Entrada:**

```ts
{ eventType: "casamento" | "aniversario"; slug: string }
```

**Saída conceitual:**

```ts
{
  title: string;
  description: string;
  canonical: string;   // absoluta
  image: string;       // absoluta
  eventType: string;
  slug: string;
}
```

**HTML produzido (todos os valores HTML-escapados):**

```html
<title>...</title>
<meta name="description" content="...">
<link rel="canonical" href="https://.../...">

<meta property="og:type" content="website">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:url" content="https://.../...">
<meta property="og:image" content="https://...">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="https://...">
```

Comportamento em erro (tenant inexistente, indisponibilidade do banco):
retornar o HTML da origem sem modificação, para nunca degradar a SPA.

## 10. Critérios de segurança respeitados

Nesta etapa **não** foram alterados: autenticação, `AuthContext`,
guards, permissões, RLS, RPCs, Edge Functions, Realtime, fluxo RSVP,
`WeddingProvider`, banco, buckets, rotas ou UI.

## 11. Arquivos

- **Criados:** `docs/edge-seo-architecture.md` (este documento).
- **Modificados:** nenhum.
- **Não alterados:** todo o restante do projeto.

## 12. Próxima etapa recomendada

**Etapa 1.25.5 — Habilitação do Edge Runtime**:

1. Conectar domínio próprio a Cloudflare (DNS/proxy) apontando para
   Lovable Hosting como origem.
2. Criar repositório/pasta isolada `worker/` com `wrangler.toml`,
   dependências mínimas (`wrangler`, opcional `hono`) e pipeline de
   deploy próprio (fora do build da SPA).
3. Extrair para `src/lib/seo/` (ou pacote separado) apenas as funções
   puras listadas na seção 6, garantindo zero dependências de React/DOM.
4. Implementar o Worker consumindo essas funções + `fetch` REST público
   ao Supabase, com fallback pass-through.
5. Validar via `curl` bruto (sem JS) que `og:*` refletem o tenant.
