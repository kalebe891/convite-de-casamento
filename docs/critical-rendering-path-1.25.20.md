# Etapa 1.25.20 — Auditoria do Caminho Crítico de Renderização (tenant público)

Escopo: rota `/:eventType/:slug`. Análise **estática** do código-fonte.
Sem métricas de tempo — nenhum valor em ms é apresentado, pois não há acesso a
Lighthouse/DevTools/produção nesta auditoria.

---

## 1. Fluxograma do caminho crítico

```
GET /:eventType/:slug
  ↓
index.html (head estático: metatags institucionais + <link> de fontes Google)
  ↓
bundle JS único (Vite SPA, sem code-splitting nas rotas — todas as páginas admin
e públicas são importadas estaticamente em src/App.tsx)
  ↓
main.tsx → HelmetProvider → ThemeProvider (next-themes, attribute="class")
  ↓
App → QueryClientProvider → TooltipProvider → Toaster/Sonner → BrowserRouter
  ↓
AuthProvider (src/contexts/AuthContext.tsx) — monta em TODAS as rotas
  ↓
Router casa /:eventType/:slug → <WeddingProvider mode="public">
  ↓
TenantPublicLayout → render #1: "Carregando evento..." (loading=true, sem Hero)
  ↓
WeddingProvider effect: 1 SELECT em wedding_details (slug + event_type)
  ↓
setWedding/setActiveId → render #2
  ↓
ThemeRenderer lê wedding.theme_id → resolveThemeId → Renderer do tema
  ↓
IndexX monta:
   • effect A: supabase.auth.getSession() + onAuthStateChange
   • effect B: SELECT events + SELECT photos (agora em paralelo)
  ↓
HeroX monta → useHeroMedia(weddingId):
   • SELECT photos WHERE is_main = true
   • SELECT timeline_events (limit 1)
   → render #3 (skeleton/hero sem imagem)
  ↓
setMainPhoto → render #4 → <img src=…> é inserida no DOM
  ↓
browser inicia download da imagem no Storage público
  ↓
LCP (imagem do Hero) / ou LCP textual quando não há foto principal
```

Conclusão estrutural: **a URL da imagem do Hero só é conhecida após dois
round-trips de rede encadeados** (wedding_details → photos), e ambos só começam
depois que o bundle JS foi baixado, parseado e o React montou a árvore.

---

## 2. Mapa das consultas

| # | Origem | Consulta | Momento | Paralelismo |
|---|---|---|---|---|
| 1 | `WeddingContext` (public) | `wedding_details` por `slug` + `event_type` | após mount do provider | isolada — **bloqueia todo o resto** |
| 2 | `IndexX` effect A | `auth.getSession()` | após `weddingId` existir (mount do tema) | paralela, não bloqueia Hero |
| 3 | `IndexX` effect B | `events` | depende de `weddingId` | **agora** em `Promise.all` com #4 |
| 4 | `IndexX` effect B | `photos` (todas) | depende de `weddingId` | idem |
| 5 | `useHeroMedia` | `photos` where `is_main` | depende de `weddingId` | `Promise.all` com #6 |
| 6 | `useHeroMedia` | `timeline_events` limit 1 | idem | idem |
| 7 | seções abaixo da dobra | `timeline_events`, `buffet`, `playlist`, `gift_items`, `guests` | após mount | concorrem por conexões HTTP com #5 |

**Waterfall confirmado (2 níveis):** `wedding_details` → (`photos` do Hero).
As consultas #3–#7 formam um segundo nível largo, disparado simultaneamente.

**Duplicação:** `photos` é consultada duas vezes por página — uma completa no
`IndexX` (usada pela galeria e pelo SEO) e outra filtrada por `is_main` no
`useHeroMedia`. Elas retornam dados sobrepostos, mas alimentam consumidores
diferentes; unificá-las mudaria a arquitetura de props/hook, então foi apenas
documentado.

---

## 3. Mapa dos hooks no caminho crítico

```
ThemeProvider (next-themes)
AuthProvider ──────────► useAuth / useAuthorization (não bloqueia o Hero)
WeddingProvider ───────► useWedding  (BLOQUEIA: Hero e tema dependem dele)
        ↓
ThemeRenderer (useOptionalWedding)
        ↓
IndexX (useNavigate, useState×3, useEffect×2)
        ↓
HeroX (useWedding + useHeroMedia ── depende de weddingId)
```

Não há dependência circular. Existe **cascata de 2 níveis obrigatória**:
`useHeroMedia` não pode disparar antes de `useWedding` resolver, porque a chave
de filtro (`weddingId`) só existe após a primeira consulta.

---

## 4. Mapa das renderizações

| Render | Gatilho | Conteúdo na tela |
|---|---|---|
| #1 | mount | `TenantPublicLayout` → texto "Carregando evento..." |
| #2 | `setWedding` | header + Hero em skeleton (sem imagem) |
| #3 | `setMainPhoto` (useHeroMedia) | Hero com `<img>` — pedido da imagem começa aqui |
| #4 | `setPhotos`/`setEvents` (IndexX) | galeria e seções; re-render de toda a página |
| #5 | `setSession` (auth) | apenas rótulo do botão "Login Admin"/"Painel" muda, mas re-renderiza a página inteira |
| #6 | realtime UPDATE em `wedding_details` | eventual |

Renders evitáveis identificados: #5 (estado `session` mantido no componente raiz
da página inteira) e o re-render completo em #4 causado por estados de página
que só interessam a seções abaixo da dobra. Ambos ocorrem **depois** do Hero, e
corrigi-los exigiria mover estado para componentes filhos (mudança estrutural) —
apenas documentado.

Não há `Suspense`, `React.lazy` ou code-splitting em nenhuma rota.

---

## 5. Caminho da imagem principal

1. Upload em `WeddingPhotosManager.tsx`: `storage.from("wedding-photos").upload(filePath, file)`
   — **sem `cacheControl` e sem `upsert` explícitos** (o SDK aplica seu default;
   o projeto não define política alguma). Idem em `PixGiftDialog.tsx`.
2. `getPublicUrl(filePath)` gera a URL absoluta, que é **persistida** na coluna
   `photos.photo_url`.
3. Leitura: `useHeroMedia` traz `photo_url`; `src/lib/seo/publicImage.ts`
   (`buildPublicImageUrl`) apenas normaliza valores relativos — URLs `http(s)`
   já persistidas passam intactas.
4. O `<img>` só entra no DOM no render #3. `fetchPriority="high"` e
   `decoding="async"` já estão aplicados (Etapa 1.25.19), mas **não há como
   preloadar**: o navegador desconhece a URL até o JS resolver duas consultas.

Nota: nenhuma configuração de cache do bucket foi presumida. O que se afirma
aqui vem exclusivamente do código de upload e da geração da URL.

---

## 6. Gargalos, por impacto

**Alto**
1. **Duplo round-trip antes da imagem** (`wedding_details` → `photos`). Estrutural.
2. **Descoberta tardia da imagem do Hero** — impossível `<link rel=preload>` sem
   HTML gerado no servidor. Estrutural.
3. **Bundle único sem code-splitting**: `src/App.tsx` importa estaticamente todas
   as páginas admin (Checkin, Logs, Estatísticas, Master Dashboard…), que são
   baixadas e parseadas mesmo em um convite público.

**Médio**

4. Consulta `photos` duplicada (IndexX + useHeroMedia).
5. Render intermediário do `TenantPublicLayout` ("Carregando evento...") — atraso
   puro antes de qualquer pintura útil.
6. `cacheControl` não definido no upload — o projeto não expressa nenhuma
   política de cache para as imagens.

**Baixo**

7. Re-render global provocado pelo estado `session` no componente raiz da página.
8. Duplicação do mesmo bloco de fetch em 6 arquivos de tema (custo de manutenção,
   não de runtime).
9. Fontes Google carregadas via `<link>` no `index.html` — já paralelizadas na
   etapa anterior; restam como dependência externa do primeiro paint textual.

---

## 7. Melhorias aplicadas (seguras, sem mudança de comportamento)

- `events` + `photos` passaram de `await` sequencial para `Promise.all` em:
  `src/pages/Index.tsx`, `src/themes/minimal|editorial|modern-noir|art-deco|sky-peach/Index*.tsx`.
  Mesmos dados, mesma ordem de `setState`, um nível de espera a menos.

Nada mais foi alterado: SEO, Worker, banco, RLS, auth, RSVP, rotas, layout e UI
permanecem intactos.

---

## 8. Recomendações futuras (não implementadas)

**Baixo impacto / baixo risco**
- Mover o estado `session` para um subcomponente do header.
- Extrair o bloco de fetch dos 6 temas para um hook único (`useTenantPageData`).

**Médio impacto**
- Unificar as duas consultas de `photos` (uma leitura, `is_main` derivado em memória).
- Definir `cacheControl` explícito no `upload()` das fotos.
- `React.lazy` para as rotas de admin, tirando esse peso do bundle público.

**Alto impacto — estrutural**
- Preload da imagem do Hero, HTML já com dados do tenant e eliminação do duplo
  round-trip só são possíveis com **domínio próprio + Edge Worker/SSR**. A
  infraestrutura já está escrita em `worker/`, porém congelada (ver
  `docs/edge-seo.md`). Enquanto isso não existir, o LCP do tenant permanece
  limitado por: download do bundle → execução do JS → 2 consultas → imagem.
