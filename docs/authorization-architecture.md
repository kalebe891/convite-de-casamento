# Arquitetura de Autorização — Decisão Oficial (Etapa 1.26.02)

> **Status:** decisão arquitetural formalizada. **Nenhuma alteração funcional foi realizada nesta etapa.**
> Migrations, policies, funções SQL, RPCs, Edge Functions, frontend, hooks, RLS, Storage, Worker e UI permanecem intocados.

---

## 1. Decisão

| Fonte | Escopo oficial | Uso |
|---|---|---|
| `public.user_weddings.role` | **Papel do usuário DENTRO de um casamento** | **Única fonte de verdade para permissões de tenant** |
| `public.user_roles.role` | **Papel global da plataforma** (master admin, suporte, moderador, operador) | Nunca para permissões de um casamento específico |

Consequência: qualquer decisão de autorização que envolva um `wedding_id` deve derivar de `user_weddings.role`
cruzado com `admin_permissions` (`menu_key` + tipo). Decisões sem `wedding_id` (painel `/admin` master,
lifecycle de tenants, suporte) continuam derivando de `user_roles`.

---

## 2. Arquitetura antiga (legado)

```
auth.uid()
   │
   ├─► user_roles.role ──► has_role(uid,'admin'|'couple'|'planner'|'cerimonial')
   │                          │
   │                          └─► policies RLS com papéis HARDCODED
   │
   └─► user_roles.role ──► has_table_permission(uid, menu_key, tipo)
                              │  (JOIN admin_permissions ON role_key = user_roles.role)
                              └─► permissão de módulo, mas SEM escopo de tenant
```

Problemas:
- papel global determinava permissão de um casamento específico;
- papéis hardcoded nas policies impedem papéis personalizados;
- `user_has_wedding_access()` mistura `user_roles` (admin global) + `user_weddings`.

## 3. Arquitetura nova (alvo)

```
auth.uid()
   │
   ├── PLATAFORMA ──► user_roles.role ──► has_role(uid,'admin')
   │                      └─► /admin master, lifecycle, suporte, Edge Functions administrativas
   │
   └── TENANT ─────► user_weddings(user_id, wedding_id, role)
                          │
                          ├─► role_profiles (catálogo de papéis, inclui personalizados)
                          └─► admin_permissions(role_key, menu_key, can_view/add/edit/delete/publish)
                                     │
                                     └─► has_table_permission_for_wedding(uid, wedding_id, menu_key, tipo)
                                                │
                                                └─► policies RLS de todas as tabelas com wedding_id
```

Fluxo de autorização por requisição de tenant:

```
requisição ──► RLS da tabela ──► has_table_permission_for_wedding
                                     ├─ vínculo existe em user_weddings(uid, wedding_id)? 
                                     ├─ role do vínculo tem can_<tipo> em admin_permissions(menu_key)?
                                     └─ (bypass) has_role(uid,'admin') global → suporte/master
```

---

## 4. Inventário — dependências de `user_roles` / `has_role()`

### 4.1 Funções SQL

| Função | Categoria | Decisão |
|---|---|---|
| `has_role(uid, role)` | Plataforma | **Permanece** (papéis globais) |
| `has_table_permission(uid, menu_key, tipo)` | **Tenant (indevido)** — faz `JOIN admin_permissions ON role_key = user_roles.role` | **Migrar** (deve deixar de ser usada em contexto de tenant) |
| `has_table_permission_for_wedding(...)` | Tenant | **Permanece**, mas deve passar a resolver o papel via `user_weddings.role` em vez de `has_table_permission` |
| `user_has_wedding_access(uid, wedding_id)` | Misto (`has_role` admin + `user_weddings`) | **Migrar** (manter apenas bypass explícito de admin global) |
| `get_user_wedding_ids(uid)` | Misto | **Migrar** (mesma observação) |
| `assign_first_admin()` | Plataforma (grava `user_roles`) | **Permanece** |
| `create_demo_tenant(...)` | Tenant — já grava `user_weddings(role='admin')` | **Permanece** (já conforme) |
| `create_new_event(...)` (2 sobrecargas) | Mista — exige `has_role(uid,'admin')` global | **Migrar/revisar** (criação é ato de plataforma; overload antiga grava `user_weddings`, a nova não) |

### 4.2 Policies RLS

**Legado (dependem de `has_role`/`user_roles`) — a migrar quando escopadas a tenant:**

| Tabela | Policy | Categoria |
|---|---|---|
| `wedding_details` | `Users can update their wedding details` | **Tenant → migrar** (raiz do bug 1.26.00) |
| `wedding_details` | `Admins can insert / delete wedding details` | Plataforma → permanece |
| `events` | `Users can manage events of their weddings` | Tenant → migrar |
| `invitations` | `Users can manage invitations of their weddings` | Tenant → migrar |
| `rsvp_tokens` | `Authorized users can manage tokens of their weddings` | Tenant → migrar |
| `rsvps` | `Users can view RSVPs of their weddings` | Tenant → migrar |
| `checkin_logs` | `Admins can delete checkin logs` | Tenant → migrar |
| `pending_users` | `Admins can manage all pending users` | Plataforma → permanece |
| `user_weddings` | `Admins can manage user_weddings` | Plataforma → permanece |
| `user_roles` | `Admins can manage all roles` | Plataforma → permanece |
| `role_profiles` | `Admins can manage role profiles` | Plataforma → permanece |
| `admin_permissions` | `Admins can manage all permissions`, `Users can view their role permissions` | Plataforma / auditoria → permanece |
| `admin_logs` | `Admins can view all admin logs` | Plataforma → permanece |
| `profiles` | `Admins can view/update all profiles` | Plataforma → permanece |

**Global-perm (`has_table_permission` sem `wedding_id`) — revisar:** `profiles`, `user_roles`, `admin_permissions`
(policies de "usuarios: view"). São de auditoria administrativa; permanecem, mas dependem indiretamente de `user_roles`.

**Misto (`user_has_wedding_access` / `get_user_wedding_ids`):** `checkin_logs` (SELECT), `gift_pix_selections` (SELECT) → migrar junto das funções.

**Já conformes (modelo novo, `has_table_permission_for_wedding`):** `guests`, `gift_items`, `buffet_items`,
`playlist_songs`, `timeline_events`, `photos`, `admin_logs` (view por tenant), `pending_users` (wedding members),
`user_weddings` (usuarios view/edit).

### 4.3 Edge Functions

| Função | Categoria | Decisão |
|---|---|---|
| `invite-admin` | Mista (valida papel para convidar em um casamento) | **Migrar** para `user_weddings.role` |
| `delete-user` | Plataforma | Permanece |
| `delete-tenant` | Plataforma | Permanece |
| `expire-demo-tenants` | Plataforma (cron) | Permanece |
| `complete-user-invite` | Mista (cria vínculo + papel) | **Revisar**: deve gravar papel em `user_weddings`, não em `user_roles` |
| `generate-rsvp-token`, `sync-checkin`, `send-rsvp-email`, `rsvp-*`, `select-gift` | Tenant / público | **Revisar** checagens de papel onde existirem |

### 4.4 Frontend

| Arquivo | Dependência atual | Decisão |
|---|---|---|
| `src/contexts/AuthContext.tsx` | busca `user_roles` (papel global) | Permanece como papel **global** |
| `src/hooks/useAuth.tsx` | sobrepõe com `user_weddings.role` quando em tenant-admin | **Já conforme** — é o comportamento oficial |
| `src/hooks/useAuthorization.tsx` | `isGlobalAdmin` via `user_roles` + `usePermissions` | Permanece; `canAccess*` de tenant devem passar a usar apenas papel de tenant |
| `src/hooks/usePermissions.tsx` | consulta `admin_permissions` pelo papel efetivo | **Já conforme** |
| `src/hooks/useRequireRole.tsx` | compara papel efetivo com lista | Revisar (papéis hardcoded) |
| `src/components/admin/UsersList.tsx`, `UsersManager.tsx` | leem/escrevem papéis | **Migrar** para `user_weddings.role` em contexto de tenant |
| `src/components/routing/MasterAdminGuard.tsx` | `canAccessMasterAdmin` (global) | Permanece |
| `src/components/routing/TenantAdminGuard.tsx` | `WeddingContext` + demo expirada | Permanece |
| `src/pages/CriarSenha.tsx`, `DeleteTenantDialog.tsx` | fluxo de convite / plataforma | Revisar / permanece |

### 4.5 Dependências atuais de `user_weddings.role`

- `src/hooks/useAuth.tsx` (override de papel por tenant) — fonte efetiva no frontend hoje;
- `src/contexts/WeddingContext.tsx` (`userWeddings`);
- policies de `user_weddings`, `pending_users` (wedding members);
- `create_demo_tenant`, `create_new_event` (overload legada), `complete-user-invite` (gravação do vínculo);
- `user_has_wedding_access` / `get_user_wedding_ids` (leitura do vínculo, sem ler o `role`).

**Observação crítica:** hoje **nenhuma policy RLS lê `user_weddings.role`**. O vínculo é usado apenas como
"tem acesso ou não"; o *papel* que alimenta `admin_permissions` vem de `user_roles`. É exatamente essa
divergência (frontend usa `user_weddings.role`, RLS usa `user_roles.role`) que produz o bug de 1.26.00:
o `UPDATE` em `wedding_details` é filtrado pela RLS e retorna 0 linhas, enquanto a UI exibe sucesso.

---

## 5. Impedimentos técnicos

**Não existe impedimento técnico** para adotar `user_weddings.role` como única fonte de verdade de tenant:

- a tabela já existe, tem `unique(user_id, wedding_id)`, índices em ambas as colunas e `role text NOT NULL`;
- `admin_permissions.role_key` e `role_profiles.role_key` são `text`, portanto casam diretamente com `user_weddings.role`;
- toda tabela de dados de tenant já possui `wedding_id`, permitindo escopo por linha;
- funções `SECURITY DEFINER` já são o padrão do projeto, evitando recursão de RLS.

Pontos de atenção (não bloqueios), a tratar nas próximas etapas:
1. `user_weddings.role` **não tem FK** para `role_profiles.role_key` (diferente de `user_roles.role`) — permite papel inválido;
2. usuários existentes podem ter papel só em `user_roles` sem `role` correspondente no vínculo → exige backfill antes de trocar as policies;
3. `has_table_permission` é usada por policies não escopadas (`profiles`, `user_roles`, `admin_permissions`) — não pode ser simplesmente removida;
4. o bypass de admin global precisa continuar explícito em cada função, senão o suporte perde acesso.

---

## 6. Validação da arquitetura

| Requisito | Suportado | Como |
|---|---|---|
| Múltiplos casamentos por usuário | ✅ | uma linha por `(user_id, wedding_id)` |
| Papéis diferentes em cada casamento | ✅ | `role` é coluna do vínculo, não do usuário |
| Papéis personalizados | ✅ | `role_profiles` + `admin_permissions` por `role_key`, sem hardcode |
| Isolamento entre tenants | ✅ | escopo por `wedding_id` em toda policy |
| Compatibilidade com `admin_permissions` | ✅ | `role_key` = `user_weddings.role` |
| Compatibilidade com `role_profiles` | ✅ | catálogo compartilhado (falta apenas a FK) |
| Papéis globais preservados | ✅ | `user_roles` + `has_role()` |

**Riscos arquiteturais:** (a) janela de inconsistência se as policies mudarem antes do backfill dos vínculos;
(b) perda de acesso de usuários cujo papel só existe em `user_roles`; (c) papéis inválidos em `user_weddings`
enquanto não houver FK. Todos mitigáveis com backfill + FK antes da troca das policies.

---

## 7. Próximas etapas (inventário de migração)

1. Backfill de `user_weddings.role` a partir de `user_roles` para vínculos existentes + FK para `role_profiles`.
2. `has_table_permission_for_wedding` passa a resolver o papel via `user_weddings.role`.
3. Migrar policies de tenant: `wedding_details` (UPDATE), `events`, `invitations`, `rsvp_tokens`, `rsvps`, `checkin_logs`.
4. Migrar `user_has_wedding_access` / `get_user_wedding_ids` (bypass admin global explícito).
5. Revisar `invite-admin` e `complete-user-invite` para gravar papel de tenant no vínculo.
6. Alinhar `UsersList` / `UsersManager` / `useRequireRole` ao papel de tenant.
7. Endurecer formulários administrativos para validar linhas afetadas (herdado de 1.26.00).

---

## 8. Confirmação

Nesta etapa foram criadas **apenas** este documento e a decisão arquitetural acima.
Nenhuma migration, policy, função SQL, RPC, Edge Function, hook, componente, tabela, bucket ou configuração foi alterada.
Nenhum comportamento do sistema mudou.
