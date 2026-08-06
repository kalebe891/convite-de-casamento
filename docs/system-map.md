# System Map — Documentação Principal do Projeto

> **Fonte oficial de consulta.** Antes de auditar o código extensivamente, consulte este documento.
> Se ele estiver desatualizado, **atualize-o como parte da própria implementação**.
> Consolidado na Etapa 1.26.08 a partir da leitura real do código-fonte e do catálogo do banco.

Documentos irmãos:
- [`ai-playbook.md`](./ai-playbook.md) — **guia operacional obrigatório antes de qualquer implementação**
- [`authorization-architecture.md`](./authorization-architecture.md) — autorização (fonte de verdade)
- [`patterns/database-write.md`](./patterns/database-write.md) — padrão obrigatório de escrita
- [`edge-seo.md`](./edge-seo.md), [`edge-seo-architecture.md`](./edge-seo-architecture.md) — SEO no Edge (congelado)
- [`tenant-lifecycle.md`](./tenant-lifecycle.md), [`demo-lifecycle.md`](./demo-lifecycle.md) — ciclo de vida de eventos
- [`pix-roadmap.md`](./pix-roadmap.md) — Pix
- [`critical-rendering-path-1.25.20.md`](./critical-rendering-path-1.25.20.md), [`…-1.25.21.md`](./critical-rendering-path-1.25.21.md) — performance

---

## Capítulo 1 — Arquitetura

### 1.1 Frontend
React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui. SPA client-side, roteamento em `src/App.tsx`.
Três superfícies: **landing institucional**, **página pública do evento (tenant)** e **painel admin**.

### 1.2 Backend
Não existe servidor próprio. Todo o backend é Lovable Cloud (Postgres + Auth + Storage + Edge Functions),
acessado pelo cliente em `src/integrations/supabase/client.ts` (arquivo gerado — nunca editar).

### 1.3 Banco de dados
Tabelas de tenant (todas com `wedding_id`): `wedding_details`, `guests`, `invitations`, `rsvp_tokens`,
`rsvps`, `events`, `gift_items`, `gift_pix_selections`, `buffet_items`, `timeline_events`, `playlist_songs`,
`photos`, `checkin_logs`, `admin_logs`, `pending_users`.
Tabelas de plataforma/identidade: `profiles`, `user_roles`, `user_weddings`, `role_profiles`, `admin_permissions`.

### 1.4 Storage
Bucket público único **`wedding-photos`**. Uploads via `WeddingPhotosManager`; URLs públicas resolvidas em
`src/lib/publicImage.ts` / `src/lib/seo/publicImage.ts`.

### 1.5 Edge Functions (`supabase/functions/`)
| Função | Papel |
|---|---|
| `generate-rsvp-token` | emite token de RSVP para um convidado |
| `rsvp-view` | lê os dados do convite a partir do token |
| `rsvp-respond` | grava a resposta do RSVP (`service_role`) |
| `send-rsvp-email` | envio de e-mail (MailerSend) |
| `select-gift` | reserva de presente via RPC `claim_gift` |
| `sync-checkin` | sincroniza check-ins (inclusive os feitos offline) |
| `invite-admin` | convida usuário para um evento |
| `complete-user-invite` | conclui o convite, cria vínculo e papel |
| `delete-user`, `delete-tenant`, `expire-demo-tenants` | plataforma |
| `mcp` | endpoint MCP público |

### 1.6 Worker (`worker/`) e SEO
Cloudflare Worker que injeta SEO server-side nas rotas de tenant (`handleRequest`, `matchTenantRoute`,
`seo/render`, `data/fetchTenant`). **Congelado desde a Etapa 1.25.13** — não alterar sem etapa dedicada.
No cliente, o SEO vive em `src/components/seo/{SEO,SeoHead}.tsx` e `src/lib/seo/*` (JSON-LD em `jsonLd.ts`).
Arquivos estáticos: `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`.

### 1.7 Autorização
Ver documento dedicado. Resumo: `user_roles` = plataforma; `user_weddings.role` = tenant;
toda policy de tenant chama `has_table_permission_for_wedding()`.

### 1.8 Realtime
Usado com parcimônia, apenas onde há colaboração/atualização ao vivo:
`src/contexts/WeddingContext.tsx`, `src/components/admin/GuestsManager.tsx`,
`src/components/wedding/GiftsSection.tsx`, `src/components/wedding/StorySection.tsx`.

### 1.9 RLS
Habilitada em todas as tabelas do schema `public`. Sem policy correspondente, a operação retorna
**zero linhas sem erro** — daí a obrigatoriedade do padrão de escrita documentado.

### 1.10 RPC
`claim_gift`, `unclaim_gift`, `create_demo_tenant`, `create_new_event`, `cleanup_archived_guests`
e as funções de autorização. Todas `SECURITY DEFINER` com `search_path = public`.

### 1.11 Admin
`/admin` = Master Admin (plataforma, `MasterAdminGuard` + `MasterAdminLayout`).
`/:eventType/:slug/admin` = painel do evento (`TenantAdminGuard` + `AdminLayout` + `AppSidebar`).

### 1.12 Tenant (página pública)
`/:eventType/:slug` → `ThemeRenderer` escolhe o tema em `src/themes/registry.ts`
(`legacy`, `editorial`, `minimal`, `modern-noir`, `art-deco`, `sky-peach`).

### 1.13 Landing
`/` (`LandingHome`), `/casamento` (`WeddingLanding`), `/aniversario` (`BirthdayLanding`) +
componentes em `src/components/marketing/*` (showcase, temas, demo signup).

### 1.14 RSVP
`/convite/:invitation_code` → `src/pages/Invitation.tsx`, apoiado por `generate-rsvp-token`,
`rsvp-view`, `rsvp-respond`. Após responder, redirecionamento com contagem regressiva.

### 1.15 Presentes
`gift_items` com `gift_kind` (item ou Pix). Reserva atômica e idempotente pela RPC `claim_gift`
(um presente por convidado, salvo liberação administrativa). UI pública: `GiftsSection`.

### 1.16 Check-in
`/…/admin/checkin`. Funciona offline: fila em IndexedDB (`src/lib/db.ts`), indicadores
`OfflineIndicator` / `useOnlineStatus`, sincronização por `sync-checkin`, auditoria em `checkin_logs`.

### 1.17 Google Calendar
Não há integração implementada. Eventos expõem `maps_url`/`address`; links de calendário, quando existirem,
são gerados no cliente. **Nada a manter no backend.**

### 1.18 Pix
Campos em `gift_items`: `pix_mode`, `pix_copy_paste_code`, `qr_image_url`, `suggested_amount`.
UI: `PixGiftDialog` (admin) e `PixQrViewerDialog` (público). Roadmap em `docs/pix-roadmap.md`.

### 1.19 Uploads
Somente imagens do evento, para o bucket `wedding-photos`, a partir de `WeddingPhotosManager`.
Triggers garantem uma única foto principal e uma única secundária por evento.

---

## Capítulo 2 — Estrutura de pastas

| Pasta | Responsabilidade |
|---|---|
| `src/` | todo o código do app cliente |
| `src/components/` | componentes; `admin/` (painel), `wedding/` (seções públicas), `marketing/` (landing), `routing/` (guards e layouts de rota), `seo/`, `shared/`, `ui/` (shadcn — não reescrever) |
| `src/pages/` | uma página por rota; `pages/admin/` espelha os `menu_key` |
| `src/hooks/` | lógica reutilizável: `useAuth`, `useAuthorization`, `usePermissions`, `usePagePermissions`, `useRequireAuth`, `useRequireRole`, `useHeroMedia`, `useOnlineStatus`, `useAdminBasePath`, `useAllRoles` |
| `src/contexts/` | estado global: `AuthContext` (sessão + papel global), `WeddingContext` (evento atual, vínculos, realtime) |
| `src/lib/` | utilidades sem UI: `permissions.ts`, `adminLogger.ts`, `db.ts` (IndexedDB), `errorHandling.ts`, `validationSchemas.ts`, `seo/`, `mcp/` |
| `src/themes/` | um diretório por tema + `registry.ts` e `ThemeRenderer.tsx` |
| `src/integrations/supabase/` | gerado automaticamente (`client.ts`, `types.ts`) — **nunca editar** |
| `supabase/` | Edge Functions e `config.toml` |
| `worker/` | Worker de SEO no Edge (congelado) |
| `docs/` | documentação oficial viva (este diretório) |
| `public/` | estáticos servidos na raiz (`robots.txt`, `sitemap.xml`, `llms.txt`, manifest PWA) |

---

## Capítulo 3 — Fluxos principais

### 3.1 Fluxo administrativo
```
Login (/auth, sem cadastro público — só convite)
        ↓
AuthContext: sessão + papel GLOBAL (user_roles)
        ↓
Selecionar casamento (slug da URL ou EventSelector)
        ↓
WeddingContext: carrega wedding_details, user_weddings, assina realtime
        ↓
Permissões: useAuth (papel efetivo do tenant) → usePermissions (admin_permissions)
        ↓
CRUD: componente admin → Supabase Client → RLS → banco
        ↓
Realtime / refetch
        ↓
Atualização da UI (somente após sucesso confirmado — ver patterns/database-write.md)
```

### 3.2 Fluxo do convidado
```
Convidado (cadastrado em guests pelo anfitrião)
        ↓
Token (generate-rsvp-token → rsvp_tokens, com expiração e uso único)
        ↓
RSVP (/convite/:code → rsvp-view → rsvp-respond; trigger sincroniza guests.status)
        ↓
Presentes (select-gift → RPC claim_gift; item ou Pix)
        ↓
Check-in (painel: guests.checked_in_at + checkin_logs; offline-first com sync-checkin)
```

---

## Capítulo 4 — Camadas

```
UI (pages / components)                  apenas apresentação e intenção
        ↓
Hooks & Contexts                         estado, papel efetivo, permissões de exibição
        ↓
Supabase Client                          JWT do usuário, papel authenticated/anon
        ↓
RLS + Policies                           autoridade real (nega silenciosamente)
        ↓
Banco (tabelas, triggers, RPCs)          integridade e regras invioláveis
        ↓
Realtime                                 propagação das mudanças
        ↓
Renderização                             re-render da UI com dado confirmado
```

Regra de ouro: **a UI nunca é autoridade**. Esconder botão é UX; permissão é RLS.

---

## Capítulo 5 — Dependências importantes

```
AuthContext            sessão + user + papel global (user_roles)
        ↓
WeddingContext         evento atual, vínculos user_weddings, realtime
        ↓
useAuth                papel EFETIVO = papel do tenant ?? papel global
        ↓
usePermissions         consulta admin_permissions pelo papel efetivo
   ├── useAuthorization   respostas semânticas (canAccessAdmin, canManageGuests, isDemoExpired…)
   └── usePagePermissions permissões da tela atual
        ↓
Pages / Components     exibem, habilitam e desabilitam a UI
```

Guards: `MasterAdminGuard` (plataforma) e `TenantAdminGuard` (evento + bloqueio de demo expirada).
Ordem de providers obrigatória: `AuthProvider` → `WeddingProvider` → guards → layouts → páginas.

---

## Capítulo 6 — Como navegar na documentação

Antes de qualquer implementação, leia [`ai-playbook.md`](./ai-playbook.md).
Depois use este índice para chegar ao documento certo:

```text
Quero implementar/alterar QUALQUER coisa
        ↓
docs/ai-playbook.md  (ordem de leitura, checklists, Definition of Done)

Quero entender a arquitetura geral, pastas, fluxos, camadas
        ↓
docs/system-map.md  (este documento)

Quero alterar permissões, papéis, RLS, acesso de tenant
        ↓
docs/authorization-architecture.md

Quero alterar CRUD (insert / update / delete)
        ↓
docs/patterns/database-write.md

Quero alterar SEO no Edge / Link Preview
        ↓
docs/edge-seo.md  (documento central, CONGELADO)
        ↓ complementares
docs/edge-seo-architecture.md          (arquitetura-alvo)
docs/edge-seo-deployment.md            (guia de deploy)
docs/edge-seo-integration-1.25.10.md   (evidence log — histórico)

Quero alterar performance / LCP / caminho crítico
        ↓
docs/critical-rendering-path-1.25.21.md  (mais recente)
docs/critical-rendering-path-1.25.20.md  (anterior — histórico)

Quero alterar ciclo de vida de eventos / expiração / arquivamento
        ↓
docs/tenant-lifecycle.md   (tenants normais)
docs/demo-lifecycle.md     (tenants demo)

Quero alterar Pix
        ↓
docs/pix-roadmap.md

Quero alterar RSVP / convites
        ↓
SEM DOCUMENTO PRÓPRIO — usar system-map.md §1.14 / §3.2 + authorization-architecture.md
                        (módulo de permissão: menu_key "convites")

Quero alterar Presentes
        ↓
SEM DOCUMENTO PRÓPRIO — usar system-map.md §1.15 + docs/pix-roadmap.md (parte Pix)

Quero alterar Check-in / offline
        ↓
SEM DOCUMENTO PRÓPRIO em docs/ — usar system-map.md §1.16 + CHECKIN_OFFLINE_GUIDE.md (raiz)

Quero alterar Google Calendar
        ↓
NÃO EXISTE INTEGRAÇÃO nem documento (system-map.md §1.17) — nada a manter

Quero alterar temas / landing / design system
        ↓
SEM DOCUMENTO PRÓPRIO — usar system-map.md §1.12, §1.13 e §2
```

**Status dos documentos**

| Documento | Natureza |
|---|---|
| `ai-playbook.md` | operacional — obrigatório |
| `system-map.md` | arquitetura oficial — vivo |
| `authorization-architecture.md` | arquitetura oficial — vivo |
| `patterns/database-write.md` | padrão normativo — vivo |
| `edge-seo.md` | arquitetura oficial — congelada (1.25.13) |
| `edge-seo-architecture.md`, `edge-seo-deployment.md` | apoio ao Edge SEO (congelado) |
| `edge-seo-integration-1.25.10.md` | histórico (evidence log) |
| `critical-rendering-path-1.25.21.md` | auditoria vigente de performance |
| `critical-rendering-path-1.25.20.md` | histórico (auditoria anterior) |
| `tenant-lifecycle.md`, `demo-lifecycle.md` | arquitetura oficial — vivo |
| `pix-roadmap.md` | roadmap / débito técnico — vivo |

---

## Capítulo 7 — Documentação viva

1. **Toda nova arquitetura deve possuir documentação própria** em `docs/`, criada na mesma etapa
   que a implementa.
2. **Nenhuma arquitetura pode existir apenas no código.** Se a única forma de entender uma decisão
   é ler os arquivos, a etapa está incompleta.
3. **Toda mudança estrutural atualiza a documentação correspondente** — banco, RLS, autorização,
   padrões de escrita, SEO, performance, ciclo de vida. Documento desatualizado é bug.
4. Documentos **históricos** (auditorias datadas, evidence logs) não são atualizados: são
   preservados como registro e marcados como tal na tabela acima.
5. Ao criar um documento novo, adicioná-lo ao índice do Capítulo 6 e à lista de documentos irmãos
   no topo deste arquivo.


---

## 8. Papéis Demo (1.28.02)

Bases de demonstração usam exclusivamente `admin_demo` (controle total do próprio tenant) e
`user_demo` (somente leitura). Ambos são papéis normais de `role_profiles` + `admin_permissions`,
atribuídos em `user_weddings` por `create_demo_tenant`. Nenhum usuário criado por Demo recebe papel
global em `user_roles`. O único bypass de permissão do frontend é `isPlatformAdmin`
(`user_roles.role = 'admin'`), usado apenas para decisões de plataforma (Master Admin).
Detalhes: `docs/authorization-architecture.md` (cap. 8) e `docs/demo-lifecycle.md`.
