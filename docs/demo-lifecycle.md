# Ciclo de Vida do Tenant Demo — v1.22.01

## Modelo
Em `wedding_details`:
- `is_demo` (boolean, default `false`)
- `demo_expires_at` (timestamptz, nulo para tenants normais)
- `tenant_status` (`active` | `archived`)
- `archived_at` (timestamptz, preenchido ao arquivar)

Tenants normais permanecem com `is_demo=false` e seguem o ciclo definido em 1.21.00.
Tenants demo são criados com `is_demo=true`, `demo_expires_at = now() + 7 dias` e `tenant_status='active'`.

## Estados

| Estado | Critérios | Painel Admin | Área pública | Vitrine |
|---|---|---|---|---|
| Demo Ativa | `is_demo=true` · `tenant_status='active'` · `demo_expires_at > now()` | ✅ funcional | ✅ funcional | ❌ oculta |
| Demo Expirada | `is_demo=true` · `tenant_status='archived'` (`demo_expires_at <= now()`) | 🔒 tela de bloqueio | ✅ funcional | ❌ oculta |

## Fluxo de criação

```
Modal /casamento (Criar meu convite)
  ↓
supabase.auth.signUp(email, password)
  ↓
Sessão autenticada?
  ├─ SIM → RPC public.create_demo_tenant
  │           ├─ valida nome obrigatório
  │           ├─ valida 1 demo ativa por usuário
  │           ├─ resolve tema (whitelist) com fallback `legacy`
  │           ├─ gera slug único (`base-xxxx`)
  │           ├─ insere wedding_details (is_demo=true, demo_expires_at=now()+7d)
  │           └─ vincula user_weddings(role='admin')
  │       → log DEMO_CREATED
  │       → redireciona para /casamento/{slug}/admin
  └─ NÃO  → toast: "Verifique seu e-mail para ativar sua demonstração."
```

`create_demo_tenant` é `SECURITY DEFINER`, com `EXECUTE` apenas para `authenticated`.

## Período ativo (7 dias)
- Painel administrativo funciona normalmente.
- Área pública (`/:eventType/:slug`) funciona normalmente.
- Convite de novos usuários permanece bloqueado.
- Exibição na vitrine permanece bloqueada (`is_demo=false` é o filtro).

## Expiração automática

Edge Function: `supabase/functions/expire-demo-tenants/index.ts`

- **Service Role obrigatória**: usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Não depende de sessão de usuário, `getUser()` ou headers de autenticação. Projetada para execução por scheduler/cron.
- **Critério de elegibilidade**:
  ```
  is_demo = true
  AND tenant_status = 'active'
  AND demo_expires_at <= now()
  ```
- **Ação aplicada** em cada tenant elegível:
  ```
  tenant_status = 'archived'
  archived_at   = now()
  ```
- **Nenhuma exclusão física**. São preservados integralmente:
  convidados, RSVPs, presentes, cronograma, fotos, buffet, playlists,
  logs, vínculos `user_weddings`, dados do evento, auditoria.
- **Log administrativo**: insere um registro `DEMO_EXPIRED` em `admin_logs` por tenant arquivado, com `record_id`, `wedding_id`, `affected_name=slug`, `old_data.tenant_status='active'` e `new_data={tenant_status:'archived', archived_at, demo_expires_at}`.

### Acionadores possíveis (não habilitados nesta etapa)
- **Supabase Scheduled Functions** (`pg_cron` + `net.http_post`).
- **GitHub Actions** com workflow agendado disparando o endpoint.
- **Cron externo** (cron-job.org, Vercel Cron, EasyCron, etc.).

Nenhum agendamento foi ativado. A Edge Function está pronta para ser invocada manualmente ou conectada a um scheduler.

## Bloqueio administrativo

Implementado em **um único ponto**: `src/components/routing/TenantAdminGuard.tsx`.

Quando `wedding.is_demo === true && wedding.tenant_status === 'archived'`, o Guard NÃO renderiza `<Outlet />` / `children`. Em vez disso, exibe a tela:

> **Esta demonstração expirou.**
> Entre em contato com nossa equipe para converter este evento em uma licença completa e continuar exatamente de onde parou.
>
> [Falar no WhatsApp]

O botão abre a URL oficial de WhatsApp já existente no projeto. Nenhuma rota nova foi criada, nenhuma página independente foi adicionada e o React Router permanece inalterado.

## Área pública
Links `/:eventType/:slug` continuam funcionando após a expiração — `WeddingContext`, `ThemeRenderer` e o carregamento público do evento permanecem inalterados. Convidados continuam podendo visualizar o convite enquanto a equipe negocia a conversão.

## Master Admin
Cards e lista exibem badge:
- `Demo · Nd` (verde/secundário) enquanto a demo está ativa.
- `Demo Expirada` (destrutivo) quando `is_demo=true` e `tenant_status='archived'`.

## Vitrine pública
`src/lib/showcase.ts` continua filtrando `is_demo=false`. Nenhuma alteração nesta etapa.

## Logs
- `DEMO_CREATED` — registrado na criação via modal.
- `DEMO_EXPIRED` — registrado pela Edge Function ao arquivar demos vencidas.
- `DEMO_CONVERTED` — registrado quando o Master Admin converte uma demo (ativa ou expirada) em licença definitiva.

## Conversão Demo → Licença (v1.22.01)

Disponível no Master Dashboard (cards e lista) sempre que `is_demo=true`, independente de `tenant_status`.

Fluxo:
1. Master Admin clica em **Converter Licença** no card/linha do tenant.
2. Confirmação via `window.confirm` ("Converter esta demonstração em uma licença definitiva?").
3. `UPDATE wedding_details SET is_demo=false, tenant_status='active', demo_expires_at=null, archived_at=null, expires_at = now() + 365 days WHERE id = :tenant`.
4. Log `DEMO_CONVERTED` com `old_data={is_demo:true, tenant_status}` e `new_data={is_demo:false, tenant_status:'active', expires_at}`.
5. Refetch imediato da query do dashboard — badges e ações refletem o novo estado.

Regras preservadas:
- Mesmo tenant (sem clonagem, sem novo slug, sem novo `wedding_details`).
- `created_at`, `wedding_date`, `slug`, `theme_id` permanecem intactos.
- Convidados, RSVPs, presentes, cronograma, buffet, playlists, fotos, mensagens, permissões, logs, `user_weddings` e URLs públicas continuam intactos.
- Se a demo estava arquivada, a conversão restaura automaticamente o acesso administrativo (o `TenantAdminGuard` libera o painel ao detectar `is_demo=false` + `tenant_status='active'`).

Nenhuma migration, Edge Function, cron, scheduler, checkout, cobrança, WhatsApp automático ou e-mail automático foi criado nesta etapa.

> **Débito técnico futuro**: recomenda-se centralizar todas as regras comerciais em uma função única (ex.: `canAccessAdmin()`), permitindo suportar demos expiradas, licenças vencidas, inadimplência e suspensões administrativas sem espalhar lógica pelo sistema. Não implementado nesta etapa — apenas documentado.

## Restrições atuais / débito técnico
- **Sem cron / scheduler ativo**: a Edge Function existe, mas não é disparada automaticamente.
- **Sem billing**: não há conversão paga, checkout, PIX ou assinatura.
- **Sem envio de e-mails de aviso** (pré-expiração ou pós-expiração).
- **Sem exclusão automática**: nada é removido após o arquivamento.
- **Sem limitação por IP**: regra única continua sendo 1 demo ativa por usuário (validada na RPC).

## UX de ativação (v1.28.00 — apenas visual)

Nenhuma migration, permissão, RLS, role, auth, cron ou exclusão foi alterada.

### Header do painel do tenant (`/:eventType/:slug/admin`)
`src/components/admin/DemoActivationBanner.tsx`, renderizado no header de `AdminLayout`.
Usa somente campos já existentes: `is_demo`, `demo_expires_at`, `tenant_status`.
- Demo ativa: contador "Teste restante · N dias" + botão `ATIVAR`.
- Demo expirada (`tenant_status='archived'` ou dias <= 0): mensagem com menor destaque
  visual ("Período de testes encerrado." + aviso de remoção em 30 dias) + botão `ATIVAR`.

O botão `ATIVAR` abre o WhatsApp usando o helper único `src/lib/whatsapp.ts`
(extraído do fluxo de RSVP): normaliza telefone, prefixa `55` e encoda a mensagem.

### Master Admin (`/admin`)
Botão **Link de ativação** → `ActivationLinkDialog` com campos Número, Mensagem e
pré-visualização do Link WhatsApp (somente leitura).

Persistência: apenas telefone e mensagem. **O link pronto nunca é salvo** — é montado
em tempo de execução.

### Campo necessário (documentado, não criado)
Não existe hoje armazenamento global de configuração da plataforma. A configuração
é persistida em `localStorage` (`activation_link_config`) com fallback padrão.
Para compartilhar entre usuários, uma etapa futura deverá criar:

```
platform_settings.activation_phone    text
platform_settings.activation_message  text
```

---

## Auditoria 1.28.01 — Arquitetura de permissões Demo (somente auditoria)

Nenhum código, migration, RLS, cron, Edge Function ou permissão foi alterado nesta etapa.

### 1. Fluxo real de criação de uma Demo

```
/casamento → DemoSignupDialog.tsx
  ↓ supabase.auth.signUp(email, password)        ← nasce o USUÁRIO (auth.users)
  ↓ trigger auth.on_auth_user_created → handle_new_user() → profiles
  ↓ trigger public.on_profile_created_assign_admin → assign_first_admin()
        ⚠ concede user_roles='admin' GLOBAL se for o 1º usuário da base
          ou se o e-mail for o do fundador. Demos normais não recebem nada.
  ↓ RPC public.create_demo_tenant(...)            ← nasce o TENANT
        insere wedding_details (is_demo=true, demo_expires_at=now()+7d, tenant_status='active')
        insere user_weddings(user_id, wedding_id, role='admin')   ← PAPEL DEFINIDO AQUI (hardcoded)
  ↓ log DEMO_CREATED (admin_logs) → redirect /:eventType/:slug/admin
```

- **Papel do usuário Demo hoje:** literal `'admin'` dentro de `create_demo_tenant` (linha `INSERT INTO public.user_weddings ... 'admin'`).
- `create_demo_tenant` **não** escreve em `role_profiles` nem em `admin_permissions`. Esses catálogos são estáticos e editados apenas via **Usuários → Permissões** (`RolePermissionsManager`).
- Nenhuma Edge Function participa da criação. Nenhuma migration cria papéis Demo.

### 2. Fluxo real de expiração (7 dias)

| Camada | Estado real |
|---|---|
| Edge Function `expire-demo-tenants` | existe, `verify_jwt=false`, usa Service Role; arquiva `tenant_status='archived'`, `archived_at=now()` e loga `DEMO_EXPIRED` |
| Agendamento | **inexistente** — `pg_cron` não está instalado (`cron.job` não existe no banco) |
| Bloqueio | `useAuthorization().isDemoExpired` → `TenantAdminGuard` exibe tela "Esta demonstração expirou" |
| UI | `DemoActivationBanner` (contador + ATIVAR) |

### 3. Fluxo real de exclusão (30 dias)

**Não existe.** O aviso "será removido em 30 dias" é apenas texto no `DemoActivationBanner`. Não há cron, job, RPC, Edge Function ou Worker que exclua Demos. `delete-tenant` existe, mas é uma ação **manual** do Master Admin.

### 4. Matriz de permissões — `admin_demo`

**`admin_demo` NÃO EXISTE.** Ausente em `role_profiles`, `admin_permissions`, `user_roles` e `user_weddings`. Nenhuma ocorrência no código-fonte.

### 5. Matriz de permissões — `user_demo`

A chave real gravada no banco é **`User_demo`** (U maiúsculo), `is_system=false`, label `User_demo`. Não existe `user_demo` em minúsculas. Zero usuários atribuídos (`user_roles` e `user_weddings` não a referenciam).

| menu_key | view | add | edit | delete | publish |
|---|---|---|---|---|---|
| estatisticas | ✅ | ❌ | ❌ | ❌ | ❌ |
| detalhes | ✅ | ❌ | ❌ | ❌ | ❌ |
| convidados | ✅ | ❌ | ❌ | ❌ | ❌ |
| convites | ✅ | ❌ | ❌ | ❌ | ❌ |
| eventos | ✅ | ❌ | ❌ | ❌ | ❌ |
| cronograma | ✅ | ❌ | ❌ | ❌ | ❌ |
| buffet | ✅ | ❌ | ❌ | ❌ | ❌ |
| playlist | ✅ | ❌ | ❌ | ❌ | ❌ |
| presentes | ✅ | ❌ | ❌ | ❌ | ❌ |
| momentos | ✅ | ❌ | ❌ | ❌ | ❌ |
| checkin | ✅ | ❌ | ❌ | ❌ | ❌ |
| usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| logs | ✅ | ❌ | ❌ | ❌ | ❌ |

`User_demo` é, portanto, **somente leitura em 13/13 menus** (idêntico ao papel `Tester`).

### 6. Diferença `admin_demo` × `user_demo`

Comparação impossível: `admin_demo` não existe. O comportamento atual da Demo equivale ao papel `admin` (sistema, permissões amplas). A diferença efetiva hoje é `admin` × `User_demo`:

| menu_key | `admin` (atual da Demo) | `User_demo` | diferença |
|---|---|---|---|
| detalhes | view + edit | view | perde `edit` |
| convidados / convites / eventos / momentos | view+add+edit+delete | view | perde add/edit/delete |
| cronograma / buffet / playlist / presentes | view+add+edit+delete+publish | view | perde add/edit/delete/publish |
| usuarios | view+add+edit+delete | view | perde add/edit/delete |
| estatisticas / logs / checkin | view | view | igual |

### 7. Tenant de referência `3b680d06-…` (`beatriz-e-diogo-lab`)

`is_demo=false`, `tenant_status='active'` e **sem nenhuma linha em `user_weddings`**. Não há permissões por tenant a extrair dele: as permissões residem exclusivamente em `admin_permissions`, que é global por `role_key` (não por tenant). Portanto a "fonte de verdade" utilizável são as linhas de `admin_permissions` acima.

### 8. Rotina candidata para a troca automática de papel

**`expire-demo-tenants`** é a única rotina apropriada e já existente. Ela já: (a) identifica exatamente o conjunto elegível (`is_demo=true AND tenant_status='active' AND demo_expires_at<=now()`), (b) roda com Service Role, (c) registra auditoria. A troca `UPDATE user_weddings SET role=<papel_demo_leitura> WHERE wedding_id IN (...)` cabe nela sem nova infraestrutura. **Não criar nova rotina.**
Restrição: ela não é disparada automaticamente (sem `pg_cron`), logo a transição só ocorrerá quando houver scheduler.

### 9. Código que assume papéis literais (pode ignorar papéis Demo)

| Arquivo | Linha | Uso literal | Impacto |
|---|---|---|---|
| `src/hooks/useAuthorization.tsx` | 49 | `role === "admin"` → `isGlobalAdmin` | papel Demo nunca será global admin (correto) |
| `src/hooks/usePermissions.tsx` | 79 | `role === "admin"` retorna `true` para tudo | **hoje a Demo (role `admin` no tenant) recebe bypass total de permissões** |
| `src/hooks/usePagePermissions.tsx` | 65 | `isAdmin: role === "admin"` | idem |
| `src/components/admin/AppSidebar.tsx` | 44 | `item.adminOnly && role !== "admin"` | itens adminOnly ocultos para papel Demo |
| `src/hooks/useRequireRole.tsx` | 64 | `menu.adminOnly && role !== "admin"` | idem |
| `src/layouts/AdminLayout.tsx` | 91 | label `admin`/`couple`/senão "Cerimonialista" | papel Demo apareceria rotulado como "Cerimonialista" |

Nada foi corrigido — apenas documentado.

### 10. Suporte da arquitetura 1.26 à transição de papel

**Suportada, sem impossibilidade técnica.** `has_table_permission_for_wedding` resolve por `user_weddings.role → role_profiles → admin_permissions`; trocar o valor de `user_weddings.role` altera permissões imediatamente, sem tocar RLS.

Pendências que a implementação futura deverá tratar:
1. `user_weddings.role` **não tem FK** para `role_profiles.role_key` → grafia errada passa e resulta em zero permissões.
2. Divergência de grafia: catálogo tem `User_demo`; a decisão arquitetural fala em `user_demo`. Definir a chave canônica antes de codificar.
3. `admin_demo` precisará ser criado em `role_profiles` + `admin_permissions` (13 menus) antes de `create_demo_tenant` passar a usá-lo.
4. `usePermissions` dá bypass total a `role === "admin"`; com `admin_demo` o painel passará a depender de fato de `admin_permissions`.
5. `assign_first_admin` pode conceder `user_roles='admin'` global ao 1º usuário — a troca de papel de tenant não revoga isso.
6. Sem `pg_cron`/scheduler, nenhuma transição automática ocorrerá.
7. Exclusão em 30 dias é promessa de UI sem implementação.
