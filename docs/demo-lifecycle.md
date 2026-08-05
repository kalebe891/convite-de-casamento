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
