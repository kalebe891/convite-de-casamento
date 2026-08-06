# AI Playbook — Guia Operacional Oficial (Etapa 1.27.00)

> **Documentação operacional.** Não é documentação do usuário nem da aplicação.
> Destina-se a qualquer IA (ou pessoa) que vá implementar algo neste projeto.
> Criada na Etapa 1.27.00, exclusivamente documental — nenhuma linha funcional alterada.

---

## 1. Objetivo

Toda implementação neste projeto deve:

- **preservar a arquitetura existente** — não introduzir modelos paralelos;
- **reutilizar** componentes, hooks, contextos, funções SQL e padrões já existentes;
- **evitar sistemas paralelos** (segunda camada de permissões, segundo provider de estado,
  segundo padrão de escrita no banco, segundo mecanismo de SEO);
- **consultar a documentação antes do código.**

A documentação em `docs/` é a **primeira fonte de verdade**. O código serve para **confirmar detalhes**
(nomes exatos de colunas, assinaturas, props), não para redescobrir a arquitetura.
Se a documentação estiver desatualizada, **atualizá-la faz parte da implementação**.

---

## 2. Ordem obrigatória de leitura

Antes de iniciar qualquer implementação:

1. `docs/system-map.md` — sempre.
2. `docs/authorization-architecture.md` — se houver qualquer aspecto de permissão, papel, RLS ou acesso.
3. `docs/patterns/database-write.md` — se houver qualquer CRUD (insert/update/delete).
4. Documentação específica da feature (ver índice de navegação em `system-map.md`).
5. **Somente então** iniciar a auditoria do código-fonte.

Ler o código antes da documentação é o erro que gerou auditorias repetidas e conclusões
arquiteturais incorretas nas séries anteriores.

---

## 3. Checklist obrigatório antes de implementar

Responder explicitamente, por escrito, antes de escrever código:

- [ ] Essa funcionalidade já existe (total ou parcialmente)?
- [ ] Existe **componente** equivalente?
- [ ] Existe **hook** equivalente?
- [ ] Existe **provider** equivalente?
- [ ] Existe **contexto** equivalente?
- [ ] Existe **padrão documentado** para esse tipo de mudança?
- [ ] Existe **arquitetura oficial** que define como isso deve ser feito?
- [ ] Existe **impossibilidade técnica**?
- [ ] Existe **limitação de infraestrutura**?
- [ ] Existe **limitação do plano Free**?
- [ ] Existe **bloqueio conhecido** já documentado (ex.: Edge SEO congelado)?

Se a resposta a qualquer uma das quatro primeiras for "sim", a implementação é **reutilização**,
não criação.

---

## 4. Checklist obrigatório antes de alterar o banco

Sempre validar, **no catálogo real do banco** (nunca por suposição):

- [ ] **migrations** existentes relacionadas ao objeto;
- [ ] **functions** que dependem da tabela/coluna (inclusive `SECURITY DEFINER`);
- [ ] **triggers** associados;
- [ ] **views** que referenciam o objeto;
- [ ] **grants** — toda tabela nova em `public` exige `GRANT` explícito;
- [ ] **RLS**: policies existentes, `USING` e `WITH CHECK`, coerência entre operações;
- [ ] **dependências** (FKs, constraints, índices, unique keys);
- [ ] **Edge Functions** que leem/escrevem o objeto;
- [ ] **frontend dependente** (componentes, hooks, tipos gerados).

Regra: nomes de policies, `menu_key`, colunas e caminhos até `wedding_id` são **auditados**, nunca inferidos.

---

## 5. Checklist obrigatório antes de alterar o frontend

Sempre localizar antes de criar:

- [ ] **componente** equivalente (`src/components/**`);
- [ ] **hook** existente (`src/hooks/**`);
- [ ] **provider** existente (`AuthProvider`, `WeddingProvider`, `ThemeProvider`);
- [ ] **contexto** existente (`AuthContext`, `WeddingContext`);
- [ ] **página** equivalente (`src/pages/**`, incluindo `pages/admin/**` espelhando os `menu_key`);
- [ ] **padrão visual existente** (tokens semânticos do `index.css`, variantes shadcn, temas em `src/themes/**`).

Nunca usar cores/valores hardcoded: o design system é baseado em tokens semânticos.

---

## 6. Checklist obrigatório antes de criar código novo

- [ ] Isso já existe?
- [ ] Posso reutilizar?
- [ ] Estou criando uma **segunda arquitetura** para o mesmo problema?
- [ ] Estou **duplicando responsabilidade** entre camadas?
- [ ] Existe documentação dizendo para fazer **diferente** do que estou fazendo?

Se qualquer resposta indicar duplicação, parar e reutilizar.

---

## 7. Fluxo obrigatório para auditorias

```text
Documentação
     ↓
Infraestrutura
     ↓
Banco
     ↓
Backend (RPCs, Edge Functions, Worker)
     ↓
Frontend
     ↓
Implementação
```

**Nunca iniciar diretamente pelo frontend.** O frontend nunca é autoridade: ele apenas reflete
o que banco/RLS permitem (ver `system-map.md`, Capítulo 4).

---

## 8. Validação de impossibilidades

Antes de implementar, validar explicitamente se há bloqueio:

**Técnicas** — React 18, Vite 5, TypeScript, Supabase (Postgres, Auth, Storage, Edge Functions),
RLS, RPCs, Cloudflare Worker, capacidades do navegador.

**Infraestrutura** — domínio, Cloudflare, DNS, plano Free do backend, limitações da plataforma
Lovable, limitações já documentadas (ex.: Edge SEO congelado desde a Etapa 1.25.13;
preload dinâmico da Hero depende da camada Edge).

Se existir bloqueio:

1. **Parar imediatamente.**
2. **Documentar** o bloqueio (motivo técnico, camada afetada).
3. **Não implementar workaround** nem solução parcial/paliativa.

---

## 9. Definition of Done

Uma etapa só está concluída quando:

- [ ] a documentação correspondente foi **atualizada**;
- [ ] a arquitetura existente foi **preservada**;
- [ ] `typecheck` está **limpo**;
- [ ] o **build** funciona;
- [ ] as **limitações** encontradas estão documentadas;
- [ ] as **decisões arquiteturais** tomadas estão documentadas.

Sem esses seis itens, a etapa está incompleta — independentemente de a funcionalidade "parecer" pronta.

---

## Regra permanente (a partir de 1.28.01)

`docs/` é a **fonte primária de conhecimento** do projeto. Antes de qualquer auditoria ou implementação:

1. Ler toda a documentação pertinente em `docs/`.
2. Validar se ela continua compatível com o código atual.
3. Atualizar os documentos existentes em caso de divergência.
4. Criar documento novo **apenas** se não houver local adequado — nunca duplicar.

Toda etapa deve encerrar com um item "Documentação" no relatório listando: arquivos criados, modificados,
auditados e pendências. A documentação reflete exatamente a implementação real: nunca documentar
funcionalidade inexistente, nunca deixar funcionalidade implementada sem documentação.


---

## Regra de papéis (1.28.02)

- Nunca escrever verificações de tenant baseadas em papel literal (`role === "admin"`).
  Usar `usePermissions().hasPermission(menu, tipo)` no frontend e
  `has_table_permission_for_wedding()` no banco.
- `isPlatformAdmin` (de `useAuth`) é o **único** atalho permitido, e apenas para plataforma.
- Papéis Demo válidos: `admin_demo` e `user_demo` (sempre minúsculos).
- Papel global em `user_roles` só pode ser concedido pelo Master Admin.
