# Etapa 1.25.10 — Registro do teste integrado local do Edge Renderer

Este documento é o *evidence log* da Etapa 1.25.10. Nenhum código de
produção foi alterado — o Worker da Etapa 1.25.9 foi executado tal
como está, contra a origem Vite local (`http://localhost:8080`) e o
projeto Supabase público (via `SUPABASE_URL` / `SUPABASE_ANON_KEY`).

## Comandos

```bash
# Worker local (Miniflare + workerd)
cd worker
node_modules/.bin/wrangler dev --port 8787 --ip 127.0.0.1 \
  --var FRONTEND_ORIGIN:http://localhost:8080 \
  --var SUPABASE_URL:<SUPABASE_URL> \
  --var SUPABASE_ANON_KEY:<SUPABASE_ANON_KEY>
```

Saída inicial do runtime:

```
⛅️ wrangler 3.114.17
Your Worker and resources are simulated locally via Miniflare.
Vars: FRONTEND_ORIGIN, SUPABASE_URL, SUPABASE_ANON_KEY
[wrangler:inf] Ready on http://127.0.0.1:8787
```

## Requisição HTTP real — tenant válido

Rota: `GET /casamento/beatriz-e-diogo`

Bloco SEO efetivamente presente no HTML bruto recebido (antes de
qualquer execução de React), extraído entre os marcadores
`<!--LOVABLE_SEO_START-->` / `<!--LOVABLE_SEO_END-->`:

```html
<!--LOVABLE_SEO_START-->
<title>Beatriz &amp; Diogo | Convite de Casamento</title>
<meta name="description" content="18 de Abril de 2026 • ALAMEDA DAS CHÁCARAS. Confira nosso convite digital." />
<link rel="canonical" href="https://convite-de-evento.lovable.app/casamento/beatriz-e-diogo" />
<meta property="og:title" content="Beatriz &amp; Diogo | Convite de Casamento" />
<meta property="og:description" content="18 de Abril de 2026 • ALAMEDA DAS CHÁCARAS. Confira nosso convite digital." />
<meta property="og:url" content="https://convite-de-evento.lovable.app/casamento/beatriz-e-diogo" />
<meta property="og:type" content="event" />
<meta property="og:image" content="https://<supabase>/storage/v1/object/public/wedding-photos/.../..jpeg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Beatriz &amp; Diogo | Convite de Casamento" />
<meta name="twitter:description" content="18 de Abril de 2026 • ALAMEDA DAS CHÁCARAS. Confira nosso convite digital." />
<meta name="twitter:image" content="https://<supabase>/storage/v1/object/public/wedding-photos/.../..jpeg" />
<!--LOVABLE_SEO_END-->
```

Todos os valores refletem o tenant real (`bride_name`, `groom_name`,
`wedding_date`, `venue_address` e foto principal via bucket público).
Nenhum `undefined`, `null` ou placeholder aparece na saída.

## Fallbacks observados

| Rota                            | Método | Status | Bloco SEO no HTML |
| ------------------------------- | ------ | ------ | ----------------- |
| `/__edge/health`                | GET    | 200    | n/a (JSON)        |
| `/casamento/beatriz-e-diogo`    | GET    | 200    | 1 bloco injetado  |
| `/casamento/beatriz-e-diogo`    | HEAD   | 200    | body vazio, sem transformação |
| `/casamento/beatriz-e-diogo`    | POST   | 404    | pass-through, sem transformação |
| `/casamento/nao-existe-mesmo`   | GET    | 200    | 0 (fallback)      |
| `/`                             | GET    | 200    | 0 (pass-through)  |
| `/casamento`                    | GET    | 200    | 0 (pass-through)  |
| `/admin`                        | GET    | 200    | 0 (pass-through)  |
| `/casamento/convite`            | GET    | 200    | 0 (pass-through)  |
| `/favicon.ico`                  | GET    | 200    | 0 (Content-Type `image/x-icon`, sem transformação) |

Idempotência confirmada em duas requisições consecutivas ao mesmo
tenant: exatamente 1 marcador `<!--LOVABLE_SEO_START-->` e 1
`<!--LOVABLE_SEO_END-->` no HTML transformado — sem duplicação.

## Consistência de headers

Resposta transformada para tenant válido:

```
HTTP/1.1 200 OK
Transfer-Encoding: chunked
Content-Type: text/html
```

- `Content-Length` original removido pelo Worker antes do streaming.
- `Content-Encoding` original removido — o runtime Cloudflare
  entrega o body descomprimido; o Worker não recomprime.
- Miniflare (workerd) devolve `Transfer-Encoding: chunked` na saída,
  coerente com body streaming.
- `Content-Type: text/html` preservado.

Nenhuma descompressão manual foi introduzida no Worker.

## Streaming preservado

- Nenhuma chamada a `response.text()` no caminho principal do
  handler (auditoria: apenas testes usam `.text()`; produção usa
  `TransformStream` via `injectSeoIntoHtmlStream`).
- Buffer com janela limitada de 256 KiB, overlap de 64 caracteres,
  detecção `</head>` case-insensitive incremental — comportamento
  já coberto pelos 8 testes existentes em
  `worker/src/http/streamInject.test.ts` (single-chunk, uppercase,
  chunk boundary, existing block, idempotency, missing head,
  buffer-limit fallback, UTF-8 multi-byte fragmentado).

## Typechecks e testes

```
worker: bun test          → 55 pass, 0 fail
worker: bun run typecheck → OK
```

Frontend não foi alterado.

## Confirmações de escopo

- Nenhum deploy Cloudflare, nenhum DNS, nenhum domínio
  customizado alterado.
- Nenhum código do frontend, banco, RLS, RPC, Edge Function
  Supabase, Auth ou RSVP alterado.
- `FRONTEND_ORIGIN`, `SUPABASE_URL` e `SUPABASE_ANON_KEY` fornecidos
  exclusivamente via `--var` do Wrangler; nenhum valor sensível
  hardcodado no Worker.
- Nenhum servidor Express/Node paralelo foi criado — a validação
  usou o runtime oficial (`workerd` via `wrangler dev`).
