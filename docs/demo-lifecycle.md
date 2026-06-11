# Ciclo de Vida do Tenant Demo — v1.21.02

## Modelo
Em `wedding_details`:
- `is_demo` (boolean, default `false`)
- `demo_expires_at` (timestamptz, nulo para tenants normais)

Tenants normais permanecem com `is_demo=false` e seguem o ciclo definido em 1.21.00 (`tenant_status`, `expires_at`, `archived_at`).
Tenants demo recebem `is_demo=true` e `demo_expires_at = now() + 7 dias`.

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
            (nenhum tenant criado, nenhuma RPC executada)
```

## Autenticação
Toda criação passa por `supabase.auth.signUp`. Nenhum tenant é criado a partir do frontend; o frontend apenas invoca a RPC, que é a única responsável por:
- gerar slug único;
- vincular proprietário (`auth.uid()`);
- definir `is_demo` e `demo_expires_at`;
- validar limite de 1 demo ativa por usuário.

`create_demo_tenant` é `SECURITY DEFINER`, com `EXECUTE` apenas para `authenticated`.

## E-mail já existente
O Supabase Auth retorna erro de duplicidade no `signUp`. O frontend traduz para:
> "Já existe uma conta cadastrada com este e-mail. Faça login para continuar."

Nenhum tenant é criado nesse caso.

## Confirmação de e-mail
Quando o projeto exige confirmação por e-mail, `signUp` retorna `session=null`. O frontend exibe:
> "Verifique seu e-mail para ativar sua demonstração."

O tenant será criado quando o usuário voltar autenticado e disparar o fluxo novamente (futura conversão).

## Vitrine pública
`src/lib/showcase.ts` agora filtra `is_demo=false` além de `tenant_status='active'` e `is_public_showcase=true`. Tenants demo permanecem acessíveis por link direto (`/:eventType/:slug`).

## Master Admin
Tenants demo exibem badge `Demo` com a contagem regressiva baseada em `demo_expires_at` (lista e cards). Nenhuma ação administrativa nova foi criada nesta etapa.

## Logs
- `DEMO_CREATED` — registrado pela criação via modal.
- `DEMO_CONVERTED` e `DEMO_EXPIRED` — reservados para etapas futuras.

## Limitações atuais / débito técnico
- **Sem cron / scheduler**: nenhuma rotina automática arquiva ou exclui demos vencidas.
- **Sem billing**: não há conversão paga, checkout ou assinatura.
- **Sem limitação por IP**: a única regra anti-abuso é 1 demo ativa por usuário, validada na RPC.
- **Confirmação de e-mail**: depende da configuração do Supabase Auth. Se ativada, o usuário precisa confirmar o e-mail antes que a demo possa ser criada.
- **Conversão futura**: a transformação de uma demo em tenant pago será implementada em etapa posterior (usar `DEMO_CONVERTED`).
