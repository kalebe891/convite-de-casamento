# Ciclo de Vida de Tenants — v1.21.00

## Modelo
Cada tenant (`wedding_details`) possui:
- `tenant_status`: `active` | `archived` (default `active`)
- `expires_at`: validade (default = `created_at + 365 dias`)
- `archived_at`: timestamp do arquivamento (nulo quando ativo)

## Fluxo
1. Tenant criado → 365 dias ativos.
2. (Futuro) 30 dias antes do vencimento → alerta administrativo.
3. Admin pode **Renovar +365 dias** enquanto ativo.
4. Sem renovação → admin pode **Arquivar** (retirada operacional).
5. Arquivado pode ser **Restaurado** sem perda de dados.
6. (Futuro) 180 dias após arquivamento → elegível para exclusão definitiva.

## Ações administrativas (Master Admin)
| Ação | Pré-requisito | Efeito |
|------|---------------|--------|
| `TENANT_RENEWED`  | `tenant_status='active'`   | `expires_at += 365 dias` |
| `TENANT_ARCHIVED` | `tenant_status='active'`   | `tenant_status='archived'`, `archived_at=now()`, `is_public_showcase=false` |
| `TENANT_RESTORED` | `tenant_status='archived'` | `tenant_status='active'`, `archived_at=null` |

Todas registradas em `admin_logs` com o nome padronizado.

## Comportamento em arquivamento
- **Nenhum dado é removido** (convidados, RSVPs, presentes, cronograma, fotos, logs preservados).
- Removido da **vitrine pública** via filtro `.eq('tenant_status','active')` em `src/lib/showcase.ts`.
- Links diretos `/:eventType/:slug` continuam acessíveis (WeddingContext não filtra).
- Auditoria preservada integralmente.

## Débito Técnico Futuro (não implementado)
- Arquivamento automático via Cron/Scheduler quando `expires_at < now()`.
- Aviso automático 30 dias antes do vencimento.
- Exclusão definitiva 180 dias após `archived_at`.
- Cobrança/renovação automatizada (billing).
- **Modo Galeria Pós-Evento**: opção em `/:eventType/:slug/admin/detalhes` para, após a data do evento, transformar a landing em álbum fotográfico (foco em "Momentos", ocultando informações secundárias).
