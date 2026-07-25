# Edge SEO — Documento Central (Etapa 1.25.13)

> **Status:** Congelado. Implementação técnica pronta, **não ativa em produção**.
> Referência única para qualquer futura etapa relacionada a Link Preview
> server-side / SEO dinâmico por tenant.

Esta etapa (1.25.13) é **exclusivamente documental**. Nenhum código de
`src/`, `worker/`, `index.html`, banco, RLS, RPCs, Edge Functions, Auth,
RSVP, Realtime, DNS, hosting, Cloudflare, domínio ou deploy foi
alterado.

---

## 1. Estado atual

```text
Usuário/Scraper
      ↓
Hosting Lovable
      ↓
index.html estático (metatags institucionais)
      ↓
React
      ↓
react-helmet-async / SeoHead (SEO dinâmico apenas client-side)
```

Limitações atuais:

- O hosting atual serve o mesmo `index.html` inicial para todas as rotas SPA.
- O React atualiza o `<head>` **depois** da execução do JavaScript.
- Scrapers que **não** executam JS (WhatsApp, Facebook, LinkedIn,
  Telegram, iMessage, Twitter/X) veem apenas o HTML estático inicial e
  portanto **não** recebem SEO dinâmico por tenant.
- O Link Preview institucional estático (`/`, `/casamento`,
  `/aniversario`) já existe em `index.html` e funciona.

## 2. Arquitetura futura

```text
Usuário/Scraper
      ↓
Domínio próprio (DNS sob nosso controle)
      ↓
Cloudflare Worker sob nosso controle
      ↓
├── /casamento/:slug
├── /aniversario/:slug
│       ↓
│   Consulta pública limitada ao Supabase
│       ↓
│   Renderização SEO (bloco HTML escapado)
│       ↓
│   Streaming HTML transformado
│
└── demais rotas
        ↓
    Pass-through
        ↓
    Origem frontend configurada (FRONTEND_ORIGIN)
```

O Worker:

- **não** substitui o frontend;
- **não** substitui o React;
- **não** substitui o Supabase;
- atua como camada HTTP intermediária;
- transforma **apenas** respostas HTML elegíveis (`text/html`, status
  2xx, com body) de rotas públicas de tenant;
- faz pass-through cru das demais requisições.

## 3. Bloqueio atual de infraestrutura

O Edge SEO está tecnicamente preparado, mas **não está ativo em
produção**, porque o projeto ainda não possui domínio próprio e não
existe uma camada Edge sob controle deste projeto capaz de interceptar
as requisições públicas antes do hosting Lovable.

Fatos:

- O Cloudflare observado atualmente pertence à infraestrutura do
  hosting, não ao projeto.
- Não existe Worker próprio ativo.
- Não existe zona Cloudflare própria configurada.
- Não existe DNS próprio apontando para uma camada Edge controlada
  pelo projeto.
- Não existe deploy de produção do Worker.
- O Worker rodando localmente via `wrangler dev` **não** é
  infraestrutura de produção.

Portanto: **o SEO dinâmico por tenant NÃO está ativo em produção.**

## 4. Componentes já implementados

### 4.1 Camada isomórfica — `src/lib/seo/`

Regras compartilhadas entre frontend e Worker:

- tipos de evento (`eventType.ts`);
- validação de rotas e slugs reservados;
- títulos, descrições, datas formatadas;
- URLs públicas e canonical;
- imagens públicas (`publicImage.ts`) com fallback institucional;
- `SITE_URL` centralizada (`siteUrl.ts`).

Restrições permanentes desta camada:

- sem `react`, `react-dom`, `react-helmet-async`, `react-router-dom`;
- sem `window`, `document`, `localStorage`;
- sem `import.meta.env`;
- sem APIs exclusivas do navegador ou do Node.

Consumidores:

- Frontend via shims (`src/lib/{siteUrl,eventType,publicImage,tenantSeo}.ts`).
- Worker via cópia lógica pura (`worker/src/seo/render.ts` reutiliza
  regras equivalentes; nenhum import cruzado entre `src/` e `worker/`).

### 4.2 Renderer HTML — `worker/src/seo/render.ts`

Características:

- Escaping HTML de todos os valores injetados.
- Bloco delimitado por marcadores específicos (idempotente).
- Substituição sem regex global frágil.
- Fallback seguro: entrada inválida → nenhuma injeção.
- Sem buffering total do fluxo HTTP (a injeção streaming vive em
  `worker/src/http/streamInject.ts`).

### 4.3 Consulta pública — `worker/src/data/fetchTenant.ts`

Consulta apenas dados mínimos via PostgREST + `SUPABASE_ANON_KEY`:

- `wedding_details`: `id`, `slug`, `event_type`, `bride_name`,
  `groom_name`, `wedding_date`, `venue_name`, `venue_address`;
- `photos`: `photo_url`, `is_main`.

Nenhuma nova coluna, tabela, migration ou permissão foi criada nesta
etapa. Nenhum dado privado é consultado. `service_role` **jamais** é
usado.

### 4.4 Integração HTTP — `worker/src/handleRequest.ts` + `router/` + `http/`

- Roteamento por `matchTenantRoute` (`/casamento/:slug`,
  `/aniversario/:slug`).
- Rotas ignoradas e métodos não-GET → pass-through cru.
- Injeção via `TransformStream` (streaming, sem `response.text()`).
- Tratamento de compressão: remove `Content-Length` e
  `Content-Encoding` do upstream após transformar; runtime Cloudflare
  recomprime conforme `Accept-Encoding` do cliente.
- Fallback sem transformação quando: sem SEO, sem body, não-HTML,
  redirect, ou status ≥ 400.
- Health check `/__edge/health` — determinístico, não consulta origem
  nem Supabase.
- Sanitização de headers: remove `authorization`, `cookie`,
  `proxy-authorization`, `x-api-key`, `x-supabase-auth`,
  `x-forwarded-authorization`, `host`, `cf-connecting-ip`,
  `cf-ipcountry`, `cf-ray`, `cf-visitor` antes de encaminhar à origem.

## 5. Configuração e segurança

### Variáveis não sensíveis

| Nome              | Papel                                              |
| ----------------- | -------------------------------------------------- |
| `FRONTEND_ORIGIN` | Origem HTTPS da SPA (sem barra final). Configurável. |

A lógica do Worker **não** assume Lovable, Vercel, Netlify, Cloudflare
Pages ou qualquer host específico. A origem permanece plugável.

### Secrets

| Nome                | Tipo   |
| ------------------- | ------ |
| `SUPABASE_URL`      | secret |
| `SUPABASE_ANON_KEY` | secret |

Regras:

- Nenhum secret é versionado.
- Nenhum valor real é hardcoded.
- Nenhum secret aparece em logs.
- O Worker não confia em cookies nem tokens privados para gerar SEO.
- Nenhuma informação privada é consultada.
- `SUPABASE_SERVICE_ROLE_KEY` **jamais** é configurada no Worker.

## 6. Ambientes

```text
development          →   .dev.vars local (não versionado)
staging              →   Cloudflare Worker staging (--env staging)
production           →   Cloudflare Worker production (--env production)
```

- Deploy é sempre **manual e explícito** (`--env <ambiente>`).
- Nenhum script realiza deploy automaticamente.
- Nenhuma configuração de produção deve ser inventada enquanto o
  domínio próprio não existir.

## 7. Checklist de ativação futura

### 7.1 Pré-condições

- [ ] Domínio próprio adquirido.
- [ ] Acesso à zona DNS.
- [ ] Conta Cloudflare sob controle do projeto.
- [ ] Domínio adicionado à Cloudflare.
- [ ] Nameservers / DNS corretamente configurados.
- [ ] Origem frontend confirmada (`FRONTEND_ORIGIN`).
- [ ] Worker deployado em staging.
- [ ] Secrets configurados (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
      `FRONTEND_ORIGIN`) por ambiente via `wrangler secret put`.
- [ ] Rota do Worker configurada (nunca `*/*` sem revisão).
- [ ] Teste HTTP externo realizado.

### 7.2 Validação em staging

Testar com requisições HTTP reais (sem JS):

```
GET /casamento/:slug
GET /aniversario/:slug
```

Confirmar no HTML **bruto**:

- Metatags presentes sem execução de JS.
- Canonical absoluto correto.
- `og:image` absoluto.
- Título e descrição correspondem ao tenant.
- Tenant inexistente → **não** gera SEO falso (pass-through).
- Rotas não elegíveis → pass-through sem transformação.

### 7.3 Produção

Somente após validação de staging bem-sucedida:

- Configurar rota de produção.
- Executar deploy explícito (`--env production`).
- Validação HTTP externa: headers, HTML bruto, fallback, tenant válido
  e tenant inexistente.

## 8. Congelamento arquitetural

Até que o domínio próprio esteja disponível, é **proibido**:

- criar outro renderer;
- criar outra função de consulta de tenant;
- duplicar `tenantSeo`;
- duplicar `publicImage`;
- criar outro mecanismo de injeção HTML;
- criar middleware alternativo;
- migrar para SSR;
- migrar para Next.js;
- migrar o hosting;
- criar novo proxy;
- criar novo sistema de cache;
- criar novos placeholders em `index.html`;
- adicionar infraestrutura fictícia.

A arquitetura existente permanece congelada.

## 9. Gate de viabilidade técnica e infraestrutura

Regra obrigatória para toda futura etapa relacionada a Edge SEO (ou
qualquer requisito que dependa de infraestrutura fora da SPA):

### Fase 1 — Definir o objetivo

Descrever exatamente o comportamento desejado, do ponto de vista do
usuário/scraper.

### Fase 2 — Auditar a infraestrutura real

Antes de implementar, verificar:

- hosting atual;
- DNS;
- domínio;
- CDN;
- server-side runtime;
- Edge Runtime;
- Workers;
- Functions;
- SSR;
- permissões;
- APIs disponíveis;
- limitações do ambiente de execução.

### Fase 3 — Verificar a possibilidade técnica

Responder explicitamente:

- A arquitetura atual suporta o requisito?
- Existe um ponto real de execução onde a solução rodará?
- O código criado será realmente consumido em produção?
- Há dependências de infraestrutura ausentes?
- A solução exige domínio, DNS, proxy, Worker, SSR ou serviço externo
  inexistente?

### Fase 4 — Identificar bloqueios

Se houver bloqueio:

- não criar código morto;
- não criar placeholders sem consumidor;
- não simular infraestrutura inexistente;
- não declarar a etapa concluída;
- reportar o bloqueio;
- apresentar alternativas reais.

### Fase 5 — Só então implementar

A implementação só começa após confirmar que:

- o requisito é tecnicamente possível;
- existe infraestrutura capaz de executar a solução;
- o código criado terá um consumidor real;
- as dependências necessárias estão disponíveis;
- o caminho de deploy é conhecido.

## 10. Regra de parada obrigatória

Se uma etapa depender de infraestrutura inexistente, a implementação
deve ser **interrompida após a auditoria**. O relatório deve informar:

- o que foi verificado;
- o que existe;
- o que não existe;
- por que a implementação não funcionaria;
- quais alternativas são tecnicamente viáveis;
- qual alternativa é recomendada.

Não criar código apenas para "deixar preparado" quando esse código não
possuir consumidor real — salvo se a etapa tiver sido explicitamente
definida como preparação arquitetural (como foi o caso das etapas
1.25.4–1.25.11).

## 11. Referências cruzadas

- `docs/edge-seo-architecture.md` — arquitetura-alvo original (1.25.4).
- `docs/edge-seo-deployment.md` — guia operacional de deploy futuro
  (1.25.11).
- `docs/edge-seo-integration-1.25.10.md` — evidências do teste
  integrado local.
- `worker/README.md` — isolamento do Worker em relação ao frontend.
- `src/lib/seo/` — camada isomórfica de SEO.
- `worker/src/` — implementação do Edge Renderer (congelada).

## 12. Próxima etapa recomendada

**Suspender o Edge SEO** até a aquisição e configuração do domínio
próprio + zona Cloudflare sob controle do projeto. Enquanto isso, o
SEO client-side (`SeoHead` + `react-helmet-async`) e o Link Preview
institucional estático em `index.html` permanecem como a solução
oficial de produção.
