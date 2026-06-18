# PIX QR Code — Roadmap & Débito Técnico

Versão atual: **1.23.01**

## Estado atual (1.23.01)

- Cadastro de presente PIX em modal de **2 etapas**:
  1. Tipo do PIX (`free` | `fixed`).
  2. Informações do presente (título, descrição, valor sugerido quando `fixed`) + **imagem do QR Code (obrigatória)** + **código PIX Copia e Cola (obrigatório)**.
- Imagem: validação de tipo (`image/*`), tamanho máximo 2 MB, compressão local para WebP, upload no bucket `wedding-photos`.
- Botão "Colar" usa `navigator.clipboard.readText()` envolto em `try/catch`. Em falha, exibe toast amigável instruindo o uso de `Ctrl+V` / `Cmd+V`. Sem permissões adicionais, sem libs externas.
- Sem integração bancária, sem webhook, sem validação financeira, sem Edge Functions.

## Débito técnico aprovado

### Geração automática do QR Code a partir do código Copia e Cola

- **Descrição:** Caso o anfitrião informe apenas o código PIX Copia e Cola, o sistema poderá gerar automaticamente uma imagem QR localmente utilizando `qrcode.react`, eliminando a necessidade do upload manual.
- **Status:** Não implementado.
- **Prioridade:** 3/10.
- **Impacto:** Reduz fricção no cadastro; mantém modelo de dados intacto (a imagem gerada poderia ser persistida no mesmo campo `qr_image_url`).
- **Restrições:** Continua sem integração bancária. Geração 100% local no cliente.
