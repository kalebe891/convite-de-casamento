# Edge SEO Renderer — Fundação (Etapa 1.25.5)

Worker Cloudflare **isolado** do frontend Vite/React. Esta pasta tem seu
próprio `package.json` e `tsconfig.json` e **não** é compilada pelo
TypeScript do frontend.

## Isolamento

- `tsconfig.json` (raiz do projeto) usa `"files": []` + `references`
  para `tsconfig.app.json` e `tsconfig.node.json`. Nenhum deles inclui
  `worker/`.
- `tsconfig.app.json` inclui apenas `"src"`.
- Vite (`vite.config.ts`) só empacota `src/`. `worker/` fica fora do
  bundle do frontend.
- O Worker **não** importa nada de `src/`. O frontend **não** importa
  nada de `worker/`.

## Runtime

- Module Worker moderno: `export default { fetch(request, env, ctx) }`.
- Sem `addEventListener('fetch', ...)` legado.
- Tipos: `@cloudflare/workers-types` (apenas dentro de `worker/`).

## Origem do frontend

`FRONTEND_ORIGIN` é sempre lida de `env` — nunca hardcodada. Trocar de
host no futuro (Cloudflare Pages, outro CDN, infra própria) exige
apenas trocar essa variável.

Distinção mantida:

- **Domínio público**: o que o usuário/scraper acessa.
- **FRONTEND_ORIGIN**: o host que serve a SPA hoje (Lovable Hosting).

## Uso local

```bash
cd worker
npm install          # ou bun install (isolado desta pasta)
npm run typecheck    # tsc -p tsconfig.json --noEmit
npm run dev          # wrangler dev  → http://127.0.0.1:8787/__edge/health
```

Health check esperado:

```json
{ "ok": true, "service": "edge-seo-renderer", "version": "1.25.5" }
```

## Deploy remoto

**Ainda não disponível.** Requer:

1. Zona Cloudflare sob controle do projeto.
2. `wrangler login` com conta autorizada.
3. `wrangler secret put FRONTEND_ORIGIN` apontando para a origem real.
4. Adicionar `routes = [...]` em `wrangler.toml` cobrindo somente
   `/:eventType/:slug` (nunca `*/*` sem revisão).

Até lá, a fundação permanece local e reversível.

## O que esta etapa NÃO faz

- Não consulta Supabase.
- Não gera SEO dinâmico nem injeta OG tags.
- Não faz proxy da origem.
- Não intercepta rotas de produção.
- Não altera hosting, DNS, autenticação, RSVP, RLS ou qualquer arquivo
  em `src/`.
