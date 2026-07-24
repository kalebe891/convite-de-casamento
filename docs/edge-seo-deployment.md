# Edge SEO Renderer — Guia de Deploy (Etapa 1.25.11)

> **Preparatório.** Nenhum comando deste documento deve ser executado
> automaticamente. Nenhum deploy, mudança de DNS ou alteração de
> hosting foi realizado nesta etapa.

## 1. Pré-requisitos

- Conta Cloudflare com permissão para publicar Workers.
- Zona Cloudflare (domínio) sob controle do projeto — obrigatória
  antes de configurar `routes` no `wrangler.toml`.
- Wrangler CLI (`npm i -g wrangler` ou usar via `npx wrangler`),
  autenticado com `wrangler login`.
- Origem de frontend acessível publicamente por HTTPS
  (`FRONTEND_ORIGIN`). Hoje é o hosting atual da SPA; no futuro
  pode ser trocado sem alterar código do Worker.
- Projeto Supabase correto por ambiente (dev, staging, produção) —
  nunca reutilizar o projeto de produção em staging/dev.

## 2. Variáveis (não sensíveis)

Ficam em `wrangler.toml` sob `[env.<ambiente>.vars]` ou em
`worker/.dev.vars` para desenvolvimento local.

| Nome              | Descrição                                          | Obrigatória |
| ----------------- | -------------------------------------------------- | ----------- |
| `FRONTEND_ORIGIN` | Origem HTTPS da SPA a proxiar (sem barra final).   | Sim         |

`FRONTEND_ORIGIN` **não** é secret, mas em produção é definida via
`wrangler secret put` para impedir versionar o valor real.

## 3. Secrets (sensíveis)

Definidos exclusivamente via `wrangler secret put ... --env <ambiente>`.
Nunca em `wrangler.toml`, código, testes, logs ou documentação.

| Nome                 | Descrição                                                  |
| -------------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`       | URL do projeto Supabase usado para SEO público do tenant.  |
| `SUPABASE_ANON_KEY`  | Chave anon do projeto Supabase correspondente.             |

Observações:

- `SUPABASE_ANON_KEY` é uma chave pública no contexto do Supabase,
  mas é tratada como configuração sensível operacional aqui — não
  é hardcoded, não é logada e não é versionada.
- Não são necessários outros secrets no Worker. `SERVICE_ROLE_KEY`
  jamais deve ser configurada neste Worker.

## 4. Ambientes

```
development                 staging                       production
FRONTEND_ORIGIN = local     FRONTEND_ORIGIN = staging     FRONTEND_ORIGIN = produção
Supabase = dev              Supabase = staging            Supabase = produção
```

- Deploy em produção exige `--env production` explícito.
  Não há deploy implícito.
- Nenhum ambiente possui `routes` até a zona Cloudflare estar
  oficialmente conectada — o Worker publicado responde apenas em
  `*.workers.dev` e não intercepta tráfego real.

## 5. Fluxo de deploy futuro (não executar agora)

```
1. wrangler login
2. wrangler secret put SUPABASE_URL       --env production
3. wrangler secret put SUPABASE_ANON_KEY  --env production
4. wrangler secret put FRONTEND_ORIGIN    --env production
5. cd worker && npm run typecheck
6. cd worker && npm run test
7. cd worker && npm run deploy:preview     # dry-run staging
8. cd worker && npm run deploy:production  # deploy explícito
9. curl https://<worker>.workers.dev/__edge/health
10. curl -s https://<worker>.workers.dev/casamento/<slug> | grep '<meta property="og:'
11. Validar fallback: curl para rota inexistente e conferir HTML original preservado.
```

Repetir passos 2–4 com `--env staging` antes de qualquer ativação
em produção.

## 6. Rotas Cloudflare

`wrangler.toml` **não** declara `routes` nem `zone_id`. Quando a
zona real existir, adicionar rotas específicas e revisadas:

```toml
[[env.production.routes]]
pattern = "seu-dominio.com/casamento/*"
zone_name = "seu-dominio.com"

[[env.production.routes]]
pattern = "seu-dominio.com/aniversario/*"
zone_name = "seu-dominio.com"
```

Nunca usar `*/*` sem revisão explícita.

## 7. Verificação de segurança pós-deploy

- `GET /__edge/health` responde `{ "ok": true, ... }` sem consultar
  Supabase nem a origem.
- Nenhuma resposta contém `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  cookies, `Authorization` ou stack traces.
- Uma rota de tenant válida retorna metatags dinâmicas no HTML
  bruto (validar com `curl -s` + `grep`).
- Uma rota de tenant inexistente cai em pass-through da origem sem
  reutilizar SEO de outro tenant.
- Falhas de Supabase/origem retornam o HTML original ou erro
  apropriado — nunca metatags fabricadas.

## 8. Escopo NÃO coberto por esta etapa

- Não altera DNS, nameservers, hosting atual, Supabase, banco,
  migrations, RLS, RPCs, Edge Functions, Auth, RSVP, rotas React
  ou lógica SEO do frontend.
- Não implementa cache global nem sistema de monitoramento.
- Não executa deploy real — os comandos acima são apenas de
  referência.
