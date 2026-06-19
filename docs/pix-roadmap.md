# PIX QR Code — Roadmap & Débito Técnico

Versão atual: **1.23.02**

## Estado atual (1.23.02)

### Cadastro administrativo (1.23.01)
- Cadastro de presente PIX em modal de **2 etapas**:
  1. Tipo do PIX (`free` | `fixed`).
  2. Informações do presente (título, descrição, valor sugerido quando `fixed`) + **imagem do QR Code (obrigatória)** + **código PIX Copia e Cola (obrigatório)**.
- Imagem: validação de tipo (`image/*`), tamanho máximo 2 MB, compressão local para WebP, upload no bucket `wedding-photos`.
- Botão "Colar" usa `navigator.clipboard.readText()` envolto em `try/catch`. Em falha, exibe toast amigável instruindo o uso de `Ctrl+V` / `Cmd+V`. Sem permissões adicionais, sem libs externas.
- Sem integração bancária, sem webhook, sem validação financeira, sem Edge Functions.

### Seleção pública via RSVP (1.23.02)
- Nova tabela `gift_pix_selections` (`wedding_id`, `guest_id`, `gift_item_id`) com `UNIQUE(guest_id, gift_item_id)` e `ON DELETE CASCADE` em `gift_items`.
- **RLS:** apenas `SELECT` para usuários com acesso ao casamento. Gravações públicas ocorrem exclusivamente via Edge Function `rsvp-respond` (service_role), seguindo o padrão atual de gravações públicas do projeto.
- Payload do RSVP expandido para suportar simultaneamente:
  - `gift_item_id?: string | null` (1 presente tradicional)
  - `pix_item_ids?: string[]` (múltiplos PIX)
- A submissão híbrida acontece em **uma única chamada** à `rsvp-respond`. O presente tradicional continua usando a RPC `claim_gift` existente; os PIX são gravados em lote com `upsert(ignoreDuplicates)` após dupla validação (mesmo `wedding_id` + `gift_kind = 'pix'`).
- Tela pública do RSVP separa visualmente "Presentes Tradicionais" (drawer atual, inalterado) e "Contribuições PIX" (checkboxes inline, mostrando apenas título, descrição e valor sugerido).
- Tela de sucesso renderiza **todos** os PIX confirmados em loop (`confirmedPixDetails.map(...)`), cada um com QR Code, código Copia e Cola e botão "Copiar código PIX" via `navigator.clipboard.writeText()` em `try/catch`.
- Auto-redirect de 7 s é suprimido quando há PIX para o convidado copiar.
- Admin (`GuestsManager`) exibe na lista de convidados, em um popover, todos os presentes (tradicional + PIX) por convidado, em formato de lista.

## Débito técnico aprovado

### 1. Geração automática do QR Code a partir do código Copia e Cola
- **Descrição:** Caso o anfitrião informe apenas o código PIX Copia e Cola, o sistema poderá gerar automaticamente uma imagem QR localmente utilizando `qrcode.react`, eliminando a necessidade do upload manual.
- **Status:** Não implementado.
- **Prioridade:** 3/10.
- **Restrições:** Continua sem integração bancária. Geração 100% local no cliente.

### 2. Estatísticas PIX
- **Descrição:** Painel administrativo com métricas das contribuições PIX (quantidade de PIX selecionados por convidado, ranking de PIX mais escolhidos, total de intenções por evento).
- **Status:** Não implementado.
- **Prioridade:** 4/10.
- **Restrições:** Apenas intenção, sem conciliação financeira.

### 3. Preview e reordenação dos PIX
- **Descrição:** Permitir que o anfitrião faça preview da apresentação pública dos PIX e reordene a sequência exibida ao convidado.
- **Status:** Não implementado.
- **Prioridade:** 5/10.

## NÃO implementado (por design)

Sem gateways, sem PIX automático, sem webhooks, sem confirmação bancária, sem status "pago", sem conciliação financeira, sem OCR, sem APIs externas.
