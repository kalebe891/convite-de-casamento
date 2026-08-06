# Arquitetura de Autorização — Documento Oficial (consolidado na Etapa 1.26.08)

> **Status:** consolidado. Reflete o estado **real** do banco e do código após as Etapas 1.26.01 → 1.26.07.
> Todas as tabelas de policies e permissões deste documento foram extraídas do catálogo do banco
> (`pg_policies`, `admin_permissions`) e da leitura do código-fonte — **nada foi inferido**.
> Esta etapa **não alterou nenhuma linha funcional** do sistema.

---

## 1. Objetivo

Definir, de forma única e definitiva, como o sistema decide **quem pode ver, criar, editar, excluir e publicar**
cada informação. A arquitetura separa dois universos que nunca devem ser confundidos:

| Universo | Pergunta que responde | Fonte de verdade |
|---|---|---|
| **Plataforma** | "Este usuário é da equipe da plataforma?" | `public.user_roles.role` |
| **Tenant (evento)** | "Este usuário pode fazer X **neste casamento/aniversário**?" | `public.user_weddings.role` |

---

## 2. Fonte de verdade

```
Permissões globais
        ↓
   user_roles.role          ← plataforma / Master Admin / Edge Functions administrativas

Permissões de tenant
        ↓
 user_weddings.role         ← ÚNICA fonte de verdade para permissões de um evento
```

**`user_roles` NÃO determina permissões de tenant.** Ele é usado exclusivamente para:

- painel Master Admin (`/admin`);
- ciclo de vida de tenants (criar, arquivar, expirar, excluir);
- Edge Functions administrativas (`delete-user`, `delete-tenant`, `expire-demo-tenants`);
- funções globais (`is_platform_admin`, `has_role`);
- bypass explícito de suporte dentro das funções de tenant.

**`user_weddings.role`** é o papel do usuário **dentro de um evento específico**. A mesma pessoa pode ser
`admin` em um evento e `planner` em outro. Papéis personalizados são suportados sem alteração de código,
porque o papel é apenas um `text` que casa com `role_profiles.role_key` e `admin_permissions.role_key`.

---

## 3. Fluxo completo de uma requisição de tenant

```
Frontend (componente admin)
        ↓            usa useAuth / useAuthorization / usePermissions só para ESCONDER UI
Supabase Client (@/integrations/supabase/client)
        ↓            envia o JWT do usuário
RLS (Row Level Security da tabela alvo)
        ↓            avalia USING (leitura/filtro) e WITH CHECK (escrita)
Policies da tabela
        ↓            chamam sempre a mesma função de tenant
has_table_permission_for_wedding(uid, wedding_id, menu_key, tipo)
        ↓
has_wedding_role_permission(uid, wedding_id, menu_key, tipo)
        ↓
admin_permissions (can_view / can_add / can_edit / can_delete / can_publish)
        ↓
role_profiles (catálogo de papéis, inclui personalizados)
        ↓
user_weddings.role (vínculo usuário ↔ evento ↔ papel)
```

**Explicação de cada etapa**

1. **Frontend** — nunca é autoridade. Ele consulta `admin_permissions` apenas para decidir o que **mostrar**.
   Esconder um botão não protege dado nenhum; a proteção real está na RLS.
2. **Supabase Client** — todas as consultas do app usam a chave publicável + JWT do usuário. O papel do
   Postgres é `authenticated` (ou `anon` em páginas públicas), nunca `service_role`.
3. **RLS** — cada tabela tem RLS habilitada. Sem policy correspondente, a operação retorna **zero linhas
   sem erro** (foi exatamente esse comportamento que originou o bug da Etapa 1.26.00).
4. **Policies** — não contêm papéis hardcoded em tabelas de tenant; delegam a decisão à função oficial.
5. **`has_table_permission_for_wedding`** — porta de entrada única da autorização de tenant.
6. **`has_wedding_role_permission`** — resolve o papel via `user_weddings` e cruza com `admin_permissions`.
7. **`admin_permissions`** — matriz `role_key × menu_key × ação`.
8. **`role_profiles`** — catálogo de papéis existentes (sistema + personalizados).
9. **`user_weddings.role`** — o vínculo. Sem vínculo (e sem ser admin global) não há acesso algum.

### Condições que fazem `has_table_permission_for_wedding` retornar TRUE

Retorna TRUE quando `_wedding_id` e `_user_id` não são nulos **e** ao menos uma alternativa é verdadeira:

1. `is_platform_admin(_user_id)` — admin global da plataforma (bypass de suporte);
2. `has_wedding_role_permission(...)` — **caminho oficial**, via `user_weddings.role`;
3. `user_has_wedding_access(...)` **E** `has_table_permission(...)` — **fallback legado**, mantido
   deliberadamente ativo para não quebrar usuários cujo papel só existe em `user_roles`.

---

## 4. Funções centrais

### `is_platform_admin(_user_id uuid) → boolean`
- **Objetivo:** dizer se o usuário é admin global da plataforma (`user_roles.role = 'admin'`).
- **Quem usa:** `has_table_permission_for_wedding`, `user_has_wedding_access`, `get_user_wedding_ids`.
- **Quando usar:** bypass de suporte e decisões de plataforma.
- **Quando NÃO usar:** como substituto de permissão de tenant.

### `has_role(_user_id uuid, _role text) → boolean`
- **Objetivo:** verificar um papel **global** em `user_roles`.
- **Quem usa:** policies de plataforma (`admin_permissions`, `user_roles`, `role_profiles`, `pending_users`,
  `profiles`, `user_weddings` admin, `wedding_details` INSERT/DELETE, `admin_logs` view all,
  `checkin_logs` DELETE), `create_new_event`.
- **Quando usar:** ações de plataforma sem `wedding_id`.
- **Quando NÃO usar:** qualquer decisão que envolva um `wedding_id`.

### `user_has_wedding_access(_user_id uuid, _wedding_id uuid) → boolean`
- **Objetivo:** existe vínculo com o evento (ou é admin global)? Responde "acesso sim/não", **não** o papel.
- **Quem usa:** `checkin_logs` (SELECT), `gift_pix_selections` (SELECT), fallback legado da função de tenant.
- **Quando usar:** leitura ampla onde não há granularidade por ação.
- **Quando NÃO usar:** para autorizar escrita ou substituir a checagem de ação.

### `has_table_permission(_user_id uuid, _menu_key text, _permission_type text) → boolean`
- **Objetivo:** permissão **global** por módulo, derivada de `user_roles` + `admin_permissions`.
- **Quem usa:** policies sem `wedding_id` (`profiles`, `user_roles`, `admin_permissions` — visão de auditoria
  do módulo `usuarios`) e o fallback legado.
- **Quando usar:** somente auditoria administrativa global.
- **Quando NÃO usar:** em qualquer tabela com `wedding_id`. **Não deve ser usada em código novo.**

### `has_table_permission_for_wedding(_user_id, _wedding_id, _menu_key, _permission_type) → boolean`
- **Objetivo:** **única** porta de autorização de tenant.
- **Quem usa:** todas as policies de tenant migradas (ver seção 5).
- **Quando usar:** sempre que a tabela tiver `wedding_id` (direto ou por relacionamento).
- **Quando NÃO usar:** decisões de plataforma.

### `has_wedding_role_permission(_user_id, _wedding_id, _menu_key, _permission_type) → boolean`
- **Objetivo:** implementação do modelo oficial — `user_weddings` → `role_profiles` → `admin_permissions`.
- **Quem usa:** apenas `has_table_permission_for_wedding`.
- **Quando usar:** indiretamente, via a função acima.
- **Quando NÃO usar:** diretamente em policies — perde o bypass de admin global e o fallback.

### `get_user_wedding_ids(_user_id uuid) → setof uuid`
- **Objetivo:** listar os eventos visíveis ao usuário (todos, se admin global).
- **Quem usa:** consultas/policies que precisam filtrar por conjunto de eventos.
- **Quando usar:** filtros de listagem.
- **Quando NÃO usar:** como prova de permissão de ação.

Todas são `SECURITY DEFINER` com `search_path = public`, evitando recursão de RLS.

---

## 5. Policies por tabela (estado real do banco)

Legenda de modelo: **Tenant** = `has_table_permission_for_wedding`; **Global** = `has_role`/`is_platform_admin`;
**Global-perm** = `has_table_permission` (sem `wedding_id`); **Misto** = `user_has_wedding_access`;
**Self** = `auth.uid()` na própria linha; **Pública** = `anon`/condição pública; **Service** = `service_role`.

| Tabela | Policy | Cmd | Modelo | Tipo |
|---|---|---|---|---|
| `admin_logs` | Users can view admin logs of their weddings | SELECT | Tenant (`logs:view`) | Tenant |
| `admin_logs` | Admins can view all admin logs | SELECT | Global | Global |
| `admin_logs` | Service role can insert logs | INSERT | — | Service |
| `admin_permissions` | Admins can manage all permissions | ALL | Global | Global |
| `admin_permissions` | Users can view their role permissions | SELECT | Self | Global |
| `admin_permissions` | Users with usuarios permission can view all permissions | SELECT | Global-perm | Global |
| `buffet_items` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`buffet:*`) | Tenant |
| `buffet_items` | Anyone can view public buffet items | SELECT | Pública | Pública |
| `checkin_logs` | Users can view checkin logs of their weddings | SELECT | Misto | Tenant |
| `checkin_logs` | Admins can delete checkin logs | DELETE | Global | Global |
| `events` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`eventos:*`) | Tenant |
| `events` | Anyone can view events | SELECT | Pública | Pública |
| `gift_items` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`presentes:*`) | Tenant |
| `gift_items` | Anyone can view public gift items | SELECT | Pública | Pública |
| `gift_pix_selections` | Users can view pix selections of their weddings | SELECT | Misto | Tenant |
| `guests` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`convidados:*`) | Tenant |
| `guests` | Checkin users can view/update guests of their weddings | SELECT/UPDATE | Tenant (`checkin:*`) | Tenant |
| `invitations` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`convites:*`) | Tenant |
| `pending_users` | Wedding members can manage pending users of their weddings | ALL | Tenant (`usuarios:*`) | Tenant |
| `pending_users` | Admins can manage all pending users | ALL | Global | Global |
| `pending_users` | Public can read valid tokens | SELECT | Pública | Pública |
| `pending_users` | Service role can manage/delete pending users | ALL/DELETE | — | Service |
| `photos` | insert/update/delete of their weddings | 3 cmds | Tenant (`momentos:*`) | Tenant |
| `photos` | Anyone can view photos | SELECT | Pública | Pública |
| `playlist_songs` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`playlist:*`) | Tenant |
| `playlist_songs` | Anyone can view public playlist songs | SELECT | Pública | Pública |
| `profiles` | Users can view/update their own profile | SELECT/UPDATE | Self | Global |
| `profiles` | Admins can view/update all profiles | SELECT/UPDATE | Global | Global |
| `profiles` | Users with usuarios permission can view all profiles | SELECT | Global-perm | Global |
| `profiles` | Service role can insert/update profiles | INSERT/UPDATE | — | Service |
| `role_profiles` | Admins can manage role profiles | ALL | Global | Global |
| `role_profiles` | Anyone can view role profiles | SELECT | Pública | Pública |
| `rsvp_tokens` | Authorized users view/insert/update/delete of their weddings | 4 cmds | Tenant (`convites:*`) | Tenant |
| `rsvp_tokens` | Anyone can read valid tokens | SELECT | Pública | Pública |
| `rsvps` | Users can view RSVPs of their weddings | SELECT | Tenant (`convites:view`) | Tenant |
| `rsvps` | Service role can insert RSVPs | INSERT | — | Service |
| `timeline_events` | view/insert/update/delete of their weddings | 4 cmds | Tenant (`cronograma:*`) | Tenant |
| `timeline_events` | Anyone can view public timeline events | SELECT | Pública | Pública |
| `user_roles` | Admins can manage all roles | ALL | Global | Global |
| `user_roles` | Users can view their own roles | SELECT | Self | Global |
| `user_roles` | Users with usuarios permission can view all roles | SELECT | Global-perm | Global |
| `user_roles` | Service role can insert user roles | INSERT | — | Service |
| `user_weddings` | Tenant managers can view/update wedding links | SELECT/UPDATE | Tenant (`usuarios:*`) | Tenant |
| `user_weddings` | Users can view their own wedding links | SELECT | Self | Global |
| `user_weddings` | Admins can manage user_weddings | ALL | Global | Global |
| `wedding_details` | Users can update their wedding details | UPDATE | Tenant (`detalhes:edit`) | Tenant |
| `wedding_details` | Admins can insert/delete wedding details | INSERT/DELETE | Global | Global |
| `wedding_details` | Anyone can view wedding details | SELECT | Pública | Pública |

`rsvps` e `checkin_logs` **não possuem** policies de escrita para usuários autenticados: a gravação ocorre
apenas via Edge Function com `service_role` (`rsvp-respond`, `sync-checkin`). Isso é intencional.

---

## 6. Módulos (menu_key → tela → tabela → policy → permissões → frontend)

| menu_key | Tela | Tabela(s) | Policy | Permissões existentes | Frontend |
|---|---|---|---|---|---|
| `detalhes` | `/…/admin/detalhes` | `wedding_details` | Tenant UPDATE | view, edit | `pages/admin/Detalhes.tsx` + `WeddingDetailsForm`, `WeddingSettingsForm`, `WeddingThemeForm`, `WeddingVisibilityForm` |
| `convidados` | `/…/admin/convidados` | `guests` | Tenant (4) | view, add, edit, delete | `pages/admin/Convidados.tsx` + `GuestsManager` |
| `convites` | — (sem rota própria) | `invitations`, `rsvp_tokens`, `rsvps` | Tenant (4 + 4 + view) | view, add, edit, delete | consumido dentro de convidados/RSVP |
| `eventos` | `/…/admin/eventos` | `events` | Tenant (4) | view, add, edit, delete | `pages/admin/Eventos.tsx` + `EventsManager` |
| `presentes` | `/…/admin/presentes` | `gift_items`, `gift_pix_selections` | Tenant (4) / Misto (view) | view, add, edit, delete, publish | `pages/admin/Presentes.tsx` + `GiftManager`, `PixGiftDialog` |
| `buffet` | `/…/admin/buffet` | `buffet_items` | Tenant (4) | view, add, edit, delete, publish | `pages/admin/Buffet.tsx` + `BuffetManager` |
| `cronograma` | `/…/admin/cronograma` | `timeline_events` | Tenant (4) | view, add, edit, delete, publish | `pages/admin/Cronograma.tsx` + `TimelineManager` |
| `playlist` | `/…/admin/playlist` | `playlist_songs` | Tenant (4) | view, add, edit, delete, publish | `pages/admin/Playlist.tsx` + `PlaylistManager` |
| `momentos` | `/…/admin/momentos` | `photos` + bucket `wedding-photos` | Tenant (3) | view, add, edit, delete | `pages/admin/Momentos.tsx` + `WeddingPhotosManager` |
| `checkin` | `/…/admin/checkin` | `guests`, `checkin_logs` | Tenant (checkin) / Misto | view, edit | `pages/admin/Checkin.tsx` + `lib/db.ts` (offline) |
| `usuarios` | `/…/admin/usuarios` | `user_weddings`, `pending_users`, `profiles`, `user_roles` | Tenant + Global-perm | view, add, edit, delete | `pages/admin/Usuarios.tsx` + `UsersManager`, `UsersList`, `PendingInvitesList`, `RolePermissionsManager` |
| `estatisticas` | `/…/admin/estatisticas` | leitura agregada de várias | herdadas das tabelas | view | `pages/admin/Estatisticas.tsx` |
| `logs` | `/…/admin/logs` | `admin_logs` | Tenant SELECT | view | `pages/admin/Logs.tsx` + `lib/adminLogger.ts` |

Matriz real por papel em `admin_permissions` (13 menus × papéis de `role_profiles`) é editável em
**Usuários → Permissões**; não há valores hardcoded no banco além dessa tabela.

---

## 7. Divergências e itens deliberadamente pendentes (série 1.27.xx)

1. **Fallback legado ativo** — a 3ª alternativa de `has_table_permission_for_wedding` ainda consulta
   `user_roles`. Remoção exige backfill completo de `user_weddings.role`.
2. **`user_weddings.role` sem FK** para `role_profiles.role_key` (diferente de `user_roles.role`) — permite papel inválido.
3. **Policies mistas** — `checkin_logs` (SELECT) e `gift_pix_selections` (SELECT) ainda usam
   `user_has_wedding_access`, sem granularidade por ação.
4. **`checkin_logs` DELETE** e **`admin_logs` view all** permanecem globais (`has_role`) — decisão consciente
   de plataforma/auditoria.
5. **`has_table_permission`** ainda é usada por `profiles`, `user_roles`, `admin_permissions` (auditoria global).
6. **`menu_key = 'convites'` sem rota própria** no frontend — hoje só protege dados.
7. **Papéis de teste no catálogo** (`test`, `teste`, `tester`, `Tester`, `Concierge`) com permissões atribuídas
   — limpeza pertence à série 1.27.xx.
8. **`create_new_event` possui duas sobrecargas**, uma das quais não cria o vínculo em `user_weddings`.

Nenhuma dessas divergências foi corrigida nesta etapa — apenas documentada.

---

## 8. Papéis Demo (auditoria 1.28.01)

Decisão arquitetural oficial registrada: usuários de bases Demo devem nascer com `admin_demo` e migrar
automaticamente para o papel Demo somente leitura após 7 dias.

Estado **real** hoje:

- `admin_demo` **não existe** em `role_profiles`, `admin_permissions`, `user_roles` nem `user_weddings`.
- Existe `User_demo` (grafia com U maiúsculo), somente leitura em 13/13 menus, sem usuários atribuídos.
- `create_demo_tenant` grava `user_weddings.role = 'admin'` (literal) — a Demo hoje tem permissões de admin
  de tenant e ainda recebe bypass total em `usePermissions` (`role === "admin"`).
- A arquitetura 1.26 suporta a transição apenas com `UPDATE user_weddings.role`; não há impossibilidade técnica.

Matrizes completas, código com papéis literais e pendências: ver `docs/demo-lifecycle.md`
(seção "Auditoria 1.28.01").
