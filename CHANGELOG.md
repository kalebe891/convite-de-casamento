# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2025-12-01

### Adicionado
- Sistema completo de permissões baseadas em papéis (role-based permissions)
- Tabela `admin_permissions` para controle granular de acesso por papel e menu
- Função `has_table_permission()` para validação dinâmica de permissões em RLS
- Gerenciador de papéis customizados no painel de Usuários
- Interface "Gerenciar Papéis do Sistema" com criação, edição e exclusão de papéis
- Permissões hierárquicas: can_view, can_add, can_edit, can_delete, can_publish
- Toggles de visibilidade pública para seções (cronograma, buffet, playlist, presentes)
- Skeleton loaders em todas as seções da página de convite
- Componentes SkeletonImage, SkeletonText, SkeletonCard, SkeletonGallery
- Ordenação alfabética em todos os gerenciadores admin (convidados, presentes, buffet, playlist)
- Redirecionamento inteligente para primeiro menu acessível após login
- Sistema de logging abrangente para debug de permissões
- Sanitização de logs em Edge Functions (tokens, emails, dados sensíveis)
- Restrições de segurança no bucket `wedding-photos` (tipos MIME, tamanho máximo 10MB)
- Validação frontend de uploads (extensões, MIME type, tamanho)
- Nomenclatura segura de arquivos com crypto.randomUUID()
- Campo "Destaque" para editar couple_message separadamente da história
- Role "tester" para testes do sistema
- Menu "Eventos" no painel administrativo para gerenciamento de celebrações

### Modificado
- Políticas RLS agora usam `has_table_permission()` para validação dinâmica
- Visibilidade de menus na sidebar filtrada por permissões do papel do usuário
- Botões CRUD desabilitados conforme permissões (can_add, can_edit, can_delete)
- Sistema de permissões sincronizado com autenticação (correção de race condition)
- Vocabulário de permissões padronizado ("Pode acessar menu", remoção de "itens")
- Campo "Sua História" agora edita todo o texto da seção StorySection
- Papel 'admin' protegido contra edição/exclusão (único papel do sistema protegido)
- Coluna `user_roles.role` alterada de ENUM para TEXT com FK para role_profiles
- Complete-user-invite Edge Function trata usuários existentes (atualiza senha/metadata)
- Título HTML corrigido (codificação dupla `&amp;amp;` → `&`)

### Removido
- Campo "Endereço do Local" do formulário de detalhes do casamento
- Textos hardcoded da seção "Nossa História" (agora totalmente editável)

### Corrigido
- Race condition no carregamento de permissões que bloqueava novos usuários
- Flash de conteúdo desatualizado em carregamento de página com skeleton loaders
- Redirecionamento fixo para /admin (agora dinâmico baseado em permissões)
- Loops infinitos em hooks de permissões
- Acesso não autorizado a menus sem permissão can_view

### Segurança
- Revisão abrangente de segurança (RLS, Edge Functions, autenticação, storage)
- Políticas RLS dinâmicas com validação de permissões em tempo real
- Sanitização completa de logs em todas as Edge Functions
- Restrições estritas de upload no bucket wedding-photos
- Validação de tipos MIME e tamanho de arquivos no frontend e backend

## [1.0.1] - 2025-11-28

### Adicionado
- Campo `is_secondary` na tabela `photos` para foto secundária
- Botão verde no gerenciador de fotos (Momentos) para definir foto secundária
- Trigger `ensure_single_secondary_photo` para garantir única foto secundária por casamento
- Exibição da foto secundária na seção "Nossa História" da página inicial
- Atualização realtime da foto secundária quando alterada no admin
- Redirecionamento automático após confirmação/recusa de RSVP (7 segundos)

### Modificado
- Texto do footer alterado de "Convite de Casamento" para "Convites de Casamento"
- Foto da seção "Nossa História" agora exibe foto secundária quando disponível
- Sistema de fotos com suporte a foto principal (is_main) e secundária (is_secondary)

### Corrigido
- Layout da galeria de momentos preservado sem alterações
- Foto secundária posicionada corretamente usando classes existentes

## [1.0.0] - 2025-11-27

### Adicionado
- Funcionalidade de edição de convidados no painel administrativo
- Validação de telefone único ao editar convidados
- Sistema completo de gerenciamento de presentes com seleção via RSVP
- Drawer responsivo para lista de presentes na página de convite

### Modificado
- Interface de usuário otimizada para dispositivos móveis
- Posicionamento do drawer de presentes ajustado (10% da borda direita em desktop)
- Badge do Lovable ocultado na interface pública
- Botões de confirmação RSVP com melhor responsividade em telas pequenas

### Corrigido
- Quebra de texto em botões de confirmação em dispositivos muito pequenos (< 372px)
- Layout do drawer de presentes em diferentes tamanhos de tela

## [0.9.0] - 2025-11-26

### Adicionado
- Sistema de logs administrativos para rastreamento de ações
- Tabela `admin_logs` com registro de inserções, alterações e exclusões
- Página de visualização de logs no painel administrativo
- Botões de edição para todos os gerenciadores (presentes, playlist, cronograma, buffet)
- Integração automática de logging em todos os gerenciadores

### Corrigido
- Correção de fuso horário na exibição da data do casamento
- Ordenação dos eventos do cronograma por horário (crescente)

## [0.8.0] - 2025-11-20

### Adicionado
- Gerenciamento de presentes (gift_items)
- Menu "Presentes" no painel administrativo
- Interface para adicionar/remover itens do registro de presentes
- Controle de visibilidade pública para presentes

## [0.7.0] - 2025-11-15

### Adicionado
- Sistema de convites de usuário via pending_users
- Fluxo de criação de senha com tokens únicos
- Edge Function `complete-user-invite` para aceitar convites
- Edge Function `invite-admin` para enviar convites
- Página `/criar-senha` para criação de senha por convite
- RLS policies para pending_users

### Modificado
- Removido signup público - sistema agora é apenas por convite
- Autenticação restrita a usuários convidados

## [0.6.0] - 2025-11-10

### Adicionado
- Sistema de check-in offline com IndexedDB
- Edge Function `sync-checkin` para sincronização de check-ins pendentes
- Tabela `checkin_logs` para auditoria de check-ins
- Indicador de status online/offline no painel admin
- Resolução de conflitos para check-ins duplicados
- Contador de check-ins pendentes
- Botão de sincronização manual

### Modificado
- PWA agora restrito apenas ao painel administrativo (/admin/*)
- Service Worker não registrado em páginas públicas

## [0.5.0] - 2025-11-05

### Adicionado
- Role "cerimonial" com permissões restritas a check-in
- Controle de acesso baseado em roles para páginas admin
- Página dedicada de check-in (/admin/checkin)
- Restrições de navegação para role cerimonial

## [0.4.0] - 2025-11-01

### Adicionado
- Configurações de visibilidade da lista de convidados
- Toggle para exibir/ocultar status de RSVP publicamente
- Toggle para exibir/ocultar lista de convidados confirmados
- Componente "Confirmados" na página de convite
- Campos `show_guest_list_public` e `show_rsvp_status_public` em wedding_details

### Modificado
- Formulário de configurações do casamento com novos controles

## [0.3.0] - 2025-10-25

### Adicionado
- Sistema de deleção em cascata para convidados
- Remoção automática de tokens RSVP ao deletar convidado
- Limpeza de mensagens/convites associados
- Validação de integridade de dados

### Modificado
- Telefone como chave primária da tabela guests (substituindo email)
- Lógica de busca e identificação de convidados baseada em telefone

## [0.2.0] - 2025-10-20

### Adicionado
- Sistema RSVP com formulário incorporado na página de convite
- Edge Functions: `rsvp-view`, `rsvp-respond`, `generate-rsvp-token`, `send-rsvp-email`
- Validação com Zod e rate limiting
- Formulário read-only após resposta
- Campos: nome, confirmação (sim/não), observações
- Remoção do campo de restrições dietéticas
- Remoção do campo de acompanhante (plus-one)

## [0.1.0] - 2025-10-15

### Adicionado
- Estrutura inicial do projeto com Vite + React + TypeScript
- Integração com Lovable Cloud (Supabase)
- Sistema de autenticação com roles (admin, couple, planner, cerimonial)
- Tabela wedding_details com informações do casamento
- Gerenciador de convidados (guests, invitations)
- Gerenciador de eventos (events)
- Gerenciador de buffet (buffet_items)
- Gerenciador de playlist (playlist_songs)
- Gerenciador de cronograma (timeline_events)
- Gerenciador de fotos (photos)
- Página pública de convite parametrizada (/convite/:invitation_code)
- Painel administrativo com sidebar
- Página de estatísticas
- Sistema de roles e permissões (user_roles)
- RLS policies para todas as tabelas
- PWA configurado com service worker
- Tema com dark/light mode
- UI Components com shadcn/ui
- Tailwind CSS com design system personalizado

### Configurado
- Supabase project ID: aksquxfuxrbpyzmyhuqu
- Estrutura de arquivos e componentes
- Rotas do React Router
- Hooks customizados (useAuth, useRequireAuth, useRequireRole, useOnlineStatus)
- Integração com idb para IndexedDB
- Configuração de PWA com manifest.json

---

## Instruções de Versionamento

### Estratégia de Tags
Para criar tags Git correspondentes a cada versão:

```bash
# Criar tag para versão específica
git tag -a v0.1.0 -m "Versão 0.1.0 - Estrutura inicial"

# Push de todas as tags
git push origin --tags

# Push de tag específica
git push origin v0.1.0
```

### Versionamento Semântico
- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis

### Próxima Release
A versão **1.0.0** será criada quando o sistema estiver pronto para produção, com release notes completas.
