# Guia de Check-in Offline - Sistema PWA

## 📱 Instalação do PWA (Progressive Web App)

### Para Android:
1. Abra o navegador Chrome no seu dispositivo Android
2. Acesse o painel administrativo em `/admin`
3. Faça login com suas credenciais
4. No menu do Chrome (três pontos), selecione "Adicionar à tela inicial"
5. Confirme a instalação do app
6. O ícone do app aparecerá na sua tela inicial

### Para iOS (iPhone/iPad):
1. Abra o Safari no seu dispositivo iOS
2. Acesse o painel administrativo em `/admin`
3. Faça login com suas credenciais
4. Toque no botão de compartilhar (ícone de seta para cima)
5. Role para baixo e selecione "Adicionar à Tela de Início"
6. Nomeie o app e toque em "Adicionar"
7. O ícone do app aparecerá na sua tela inicial

### Para Desktop (Windows/Mac):
1. Abra o navegador Chrome
2. Acesse o painel administrativo em `/admin`
3. Faça login com suas credenciais
4. No canto direito da barra de endereços, clique no ícone de instalação (+)
5. Clique em "Instalar"
6. O app será instalado como um aplicativo desktop

---

## 🎯 Passo a Passo para Cerimonialistas

### 1. Preparação Antes do Evento
- **Instale o PWA** seguindo as instruções acima
- **Conecte-se à internet** e acesse `/admin/checkin`
- **Aguarde o carregamento completo** da lista de convidados
- O sistema salvará automaticamente os dados localmente
- Verifique se a mensagem "🟢 Conectado — Tudo sincronizado" aparece no topo

### 2. Durante o Evento (com ou sem internet)
- Abra o app instalado na tela inicial
- Acesse a página "Check-in" no menu lateral
- Use a **barra de busca** para encontrar convidados rapidamente:
  - Digite o nome do convidado
  - Digite o e-mail do convidado
  - Os resultados aparecem instantaneamente

### 3. Realizando Check-ins
- Localize o convidado na lista
- Observe o status indicado por badges coloridos:
  - 🟢 **Verde** = Check-in já realizado
  - 🔵 **Azul** = Confirmado, aguardando check-in
  - 🔴 **Vermelho** = Não confirmado
- Clique no botão "Check-in" ao lado do nome do convidado
- **Com internet:** Check-in é salvo imediatamente no servidor
- **Sem internet:** Check-in é salvo localmente e aparecerá como "pendente"

### 4. Sincronização de Check-ins Offline
Quando você realizar check-ins sem conexão à internet:

**Indicadores visuais:**
- Banner amarelo no topo: "🟡 Modo offline — X alterações pendentes"
- Contador de pendências visível

**Sincronização automática:**
- Assim que a internet voltar, o sistema sincroniza automaticamente
- Você verá uma mensagem de confirmação: "Sincronização completa"
- O contador de pendências será zerado

**Sincronização manual:**
- Clique no botão "Sincronizar" no canto superior direito
- Aguarde a confirmação da sincronização
- Verifique se todas as pendências foram enviadas

### 5. Resolução de Conflitos
Se houver conflitos (ex: mesmo convidado com check-in feito por outra pessoa):
- O sistema prefere sempre o check-in **mais antigo** (first check-in wins)
- Banner amarelo exibe: "⚠️ X conflito(s) detectado(s) e resolvido(s) automaticamente"
- Clique em "Ver detalhes" para visualizar informações do conflito:
  - E-mail do convidado
  - Timestamps comparados (existente vs recebido)
  - Regra aplicada (duplicado, offline mais antigo, mesmo timestamp)
  - Ação tomada (mantido ou substituído)
  - Origem (offline/online)
- Os logs de auditoria mantêm registro completo de todas as ações e conflitos

---

## ✅ Checklist de QA (Testes)

### Teste 1: Carregamento Online
- [ ] Acessar `/admin/checkin` com internet conectada
- [ ] Verificar se a lista de convidados é carregada
- [ ] Confirmar mensagem "🟢 Conectado — Tudo sincronizado"

### Teste 2: Check-in Online
- [ ] Marcar 3 check-ins diferentes com internet conectada
- [ ] Verificar se os badges mudam para verde imediatamente
- [ ] Confirmar toast de sucesso "Check-in realizado"

### Teste 3: Modo Offline
- [ ] Desativar Wi-Fi e dados móveis no dispositivo
- [ ] Verificar banner "🟡 Modo offline"
- [ ] Marcar 3 check-ins sem internet
- [ ] Verificar contador de pendências aumentando

### Teste 4: Sincronização Automática
- [ ] Reativar internet (Wi-Fi ou dados móveis)
- [ ] Aguardar sincronização automática (até 10 segundos)
- [ ] Verificar toast "Sincronização completa"
- [ ] Confirmar contador de pendências em zero

### Teste 5: Sincronização Manual
- [ ] Modo offline: marcar 2 check-ins
- [ ] Reativar internet
- [ ] Clicar no botão "Sincronizar" manualmente
- [ ] Verificar sincronização bem-sucedida

### Teste 6: Busca de Convidados
- [ ] Buscar convidado por nome parcial
- [ ] Buscar convidado por e-mail completo
- [ ] Verificar resultados instantâneos

### Teste 7: Conflitos Básicos
- [ ] Em outro dispositivo, fazer check-in do mesmo convidado
- [ ] No dispositivo offline, tentar sincronizar check-in antigo
- [ ] Verificar que o mais antigo prevalece (first check-in wins)

### Teste 8: Check-in Duplo com Timestamps Diferentes
- [ ] Dispositivo A faz check-in às 10:00
- [ ] Dispositivo B (offline) tenta check-in às 10:05
- [ ] Resultado esperado: Check-in de 10:00 mantido
- [ ] Verificar conflito registrado com reason: "duplicate"
- [ ] Abrir modal de detalhes e confirmar informações

### Teste 9: Offline Mais Antigo que Online
- [ ] Dispositivo A (online) faz check-in às 10:00
- [ ] Dispositivo B (offline) tinha check-in de 09:55
- [ ] Sincronizar dispositivo B
- [ ] Resultado esperado: Check-in substituído para 09:55
- [ ] Verificar conflito registrado com reason: "older_offline"

### Teste 10: Mesmo Timestamp de Dispositivos Diferentes
- [ ] Dispositivo A (online) faz check-in às 10:00:00
- [ ] Dispositivo B (offline) com check-in às 10:00:00
- [ ] Sincronizar dispositivo B
- [ ] Resultado esperado: Versão online mantida
- [ ] Verificar conflito registrado com reason: "same_timestamp"

### Teste 11: Offline Enviado Após 24h
- [ ] Dispositivo em modo offline por 24 horas
- [ ] Realizar check-in offline
- [ ] Reconectar e sincronizar
- [ ] Verificar aplicação de regras de timestamp

### Teste 12: Timestamp Alterado Manualmente (Teste de Fraude)
- [ ] Abrir DevTools → Application → IndexedDB
- [ ] Modificar timestamp de check-in pendente para data passada
- [ ] Sincronizar
- [ ] Verificar que sistema detecta e aplica regras de conflito

### Teste 13: Permissões (Cerimonial)
- [ ] Login com papel "cerimonial"
- [ ] Verificar acesso à página de check-in
- [ ] Confirmar que não há acesso a outras páginas administrativas

### Teste 14: Logs de Auditoria
- [ ] Acessar com perfil admin
- [ ] Verificar tabela `checkin_logs` no banco de dados
- [ ] Confirmar registro de `source` (online/offline)
- [ ] Verificar campo `performed_by` com ID do usuário
- [ ] Verificar campo `metadata` com detalhes de conflitos

### Teste 15: Instalação PWA
- [ ] Testar instalação em iOS
- [ ] Testar instalação em Android
- [ ] Verificar ícone na tela inicial
- [ ] Abrir app e confirmar funcionamento offline

---

## 🔐 Segurança

- Todas as atualizações de check-in passam pela Edge Function `sync-checkin`
- A função valida permissões do usuário (admin, couple, planner, cerimonial)
- Rate limiting: máximo 30 requisições por minuto por usuário
- RLS (Row-Level Security) aplicado em todas as tabelas sensíveis
- Logs de auditoria completos com `performed_by` e `source`

---

## 📊 Estrutura do Banco de Dados

### Tabela: `guests`
- Campo `checked_in_at`: data/hora do check-in
- Campo `status`: atualizado para "confirmed" após check-in

### Tabela: `invitations`
- Campo `checked_in_at`: sincronizado com `guests`
- Campo `attending`: atualizado para `true` no check-in

### Tabela: `checkin_logs`
- `guest_email`: e-mail do convidado
- `guest_id`: ID do convidado
- `checked_in_at`: momento do check-in
- `performed_by`: ID do usuário que realizou
- `source`: "online" ou "offline"
- `metadata`: dados adicionais (device info, conflitos)
  - `conflict`: boolean indicando se houve conflito
  - `reason`: motivo do conflito ("duplicate", "older_offline", "same_timestamp")
  - `kept`: indica qual versão foi mantida ("existing" ou "online")
  - `replaced`: indica se houve substituição ("existing")
  - `existing_timestamp`: timestamp do check-in existente
  - `incoming_timestamp`: timestamp do check-in recebido

---

## 🚨 Troubleshooting

### Problema: Sincronização não funciona
**Solução:**
- Verifique se há internet ativa
- Clique em "Sincronizar" manualmente
- Verifique o console do navegador para erros

### Problema: Check-ins não aparecem na lista
**Solução:**
- Atualize a página (pull to refresh)
- Verifique se está conectado à internet
- Limpe o cache do app e recarregue

### Problema: App não instala no iPhone
**Solução:**
- Use apenas o Safari (não Chrome ou outros navegadores)
- Certifique-se de estar na versão mais recente do iOS
- Tente novamente após fazer login

### Problema: Pendências não sincronizam
**Solução:**
- Verifique conexão de internet
- Tente sincronização manual
- Se persistir, entre em contato com administrador

---

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com o administrador do sistema.

**Versão:** 1.0  
**Última atualização:** Novembro 2023
