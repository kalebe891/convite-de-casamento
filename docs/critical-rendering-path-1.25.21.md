# Etapa 1.25.21 — Auditoria estática do Critical Rendering Path (Hero pública)

> Toda a análise abaixo é **estática**, baseada exclusivamente no código-fonte.
> Nenhuma medição real foi executada (sem Lighthouse, sem tempos de rede, sem
> métricas de navegador). Nenhum número de desempenho é apresentado.

## 1. Caminho crítico mapeado

```text
/:eventType/:slug
  ↓ App.tsx → TenantPublicLayout → WeddingProvider (mode="public")
  ↓ [rede #1] supabase.from("wedding_details").select("*").eq(slug).eq(event_type)
  ↓ ThemeRenderer → resolve theme_id no registry (síncrono)
  ↓ Index<Tema> monta
      ├─ [rede #2a] events (paralelo)
      ├─ [rede #2b] photos (todas, para GallerySection + og:image)
      └─ Hero<Tema> → useHeroMedia(weddingId)
             ├─ [rede #3a] photos WHERE is_main = true
             └─ [rede #3b] timeline_events (primeiro evento público)
  ↓ photo_url → (valores já absolutos no banco) → <img> / background-image
```

### Dependências e pontos de espera

- **Waterfall de 2 níveis obrigatório**: nenhuma consulta de tenant pode partir
  antes de `wedding_details` resolver, porque `weddingId` é a chave de todas as
  demais. É uma dependência de dados real, não um defeito de implementação.
- **Terceiro nível implícito**: o download da imagem Hero só começa depois de
  `photos` retornar `photo_url` (nível 3 do waterfall: JS → query → imagem).
- Dentro de cada nível, as consultas já são disparadas em paralelo
  (`Promise.all` nos renderizadores de tema e em `useHeroMedia`).

## 2. Gargalos encontrados

| # | Gargalo | Status |
|---|---------|--------|
| G1 | `HeroSection.tsx` replicava integralmente a lógica de `useHeroMedia` (mesmo par de consultas, estado próprio) | **Corrigido** |
| G2 | `HeroEditorial.tsx` usa `background-image`, que não aceita `fetchPriority`; a imagem LCP não recebia sinal de prioridade | **Corrigido** |
| G3 | `photos` é consultada duas vezes por página (lista completa no Index do tema + `is_main` no `useHeroMedia`) | **Remanescente** (ver 6.1) |
| G4 | Waterfall de 3 níveis até o byte da imagem Hero | **Limitação arquitetural** (ver 6.2) |
| G5 | Upload sem `cacheControl` explícito | **Documentado**, não alterado |

## 3. Correções aplicadas

### G1 — `src/components/wedding/HeroSection.tsx`
Substituído o `useEffect` local (que fazia exatamente as mesmas duas consultas)
pelo hook compartilhado `useHeroMedia(weddingDetails?.id)`. Mesma quantidade de
requisições, mesmo comportamento visual; elimina código duplicado, um `useState`
redundante e um efeito extra. O hook já implementa guarda de cancelamento
(`cancelled`), que a versão local não tinha — remove também um possível
`setState` após desmontagem.

### G2 — `src/components/wedding/HeroEditorial.tsx`
Adicionado um `<img>` oculto (`className="hidden"`, `aria-hidden`) com
`loading="eager"`, `fetchPriority="high"` e `decoding="async"`, apontando para a
mesma URL do `background-image`. É exatamente o padrão já usado em
`HeroSection.tsx`. Como a URL é idêntica, o navegador reaproveita a mesma
entrada de cache HTTP — não há segunda requisição de rede. Zero mudança visual.

## 4. Auditoria de renderizações

Verificado em `WeddingContext`, `ThemeRenderer`, `useHeroMedia` e nos seis
Heroes:

- `WeddingContext` já expõe `setCurrentWedding` via `useCallback`; o `value` é
  recriado a cada render do provider, mas os consumidores são poucos e leves —
  memoizar aqui não elimina trabalho comprovado, apenas adiciona código.
- Os Heroes não recebem props objeto recriadas (consomem contexto/hook direto);
  `HeroSection` recebe `weddingDetails`, que é a referência estável vinda do
  contexto.
- Nenhum callback é passado para listas ou componentes pesados.

**Conclusão:** nenhum `React.memo`/`useMemo`/`useCallback` foi adicionado. Não
há evidência estática de re-render custoso; aplicá-los seria especulativo.

## 5. Auditoria de imagens e CLS

| Hero | Técnica | eager | fetchPriority | decoding | Reserva de espaço |
|------|---------|-------|---------------|----------|-------------------|
| HeroSection | background + img oculta | padrão (não-lazy) | ✅ | ✅ | `h-screen` |
| HeroEditorial | background + img oculta | ✅ (adicionado) | ✅ (adicionado) | ✅ (adicionado) | `h-screen` |
| HeroMinimal | `<img>` | ✅ | ✅ | ✅ | `aspect-[4/5]` / `h-[70vh]` |
| HeroArtDeco | `<img>` | ✅ | ✅ | ✅ | `aspect-[4/5]` / `aspect-[3/4]` |
| HeroModernNoir | `<img>` | ✅ | ✅ | ✅ | `aspect-[4/5]` / container fixo |
| HeroSkyPeach | `<img>` | ✅ | ✅ | ✅ | `h-[55vh]` / `h-screen` |

Todos os contêineres de imagem têm altura ou `aspect-ratio` definidos por CSS
antes do carregamento, com `bg-muted` de fundo — **não há layout shift** causado
pela Hero. Atributos `width`/`height` no HTML seriam redundantes aqui, já que o
layout é totalmente controlado pelo container (`absolute inset-0 object-cover`);
não foram adicionados para não arriscar regressão de layout.

## 6. Auditoria de URLs públicas, cache e upload

`buildPublicImageUrl()` (isomórfico) e `resolvePublicImageUrl()` (adaptador Vite)
apenas montam URLs absolutas: preservam `http(s):`/`data:`, resolvem paths
relativos contra o bucket público e retornam `null` sem `supabaseUrl`. Não há
duplicação de lógica (o adaptador é um wrapper fino) nem concatenação
redundante. **Nenhum parâmetro de transformação existe hoje e nenhum foi
adicionado.**

Observação relevante: os registros de `photos` gravam `photo_url` já **absoluta**
(o upload chama `getPublicUrl` e persiste o resultado), portanto no caminho da
Hero as funções acima executam apenas o curto-circuito `^https?://` — custo
desprezível e nenhuma reconstrução real de URL.

Como a URL é estável e idêntica entre background e `<img>`, o cache do navegador
é naturalmente reaproveitado dentro da sessão e entre navegações do SPA.

**Upload** (`WeddingPhotosManager.tsx`): `supabase.storage.from("wedding-photos").upload(filePath, file)`
é chamado **sem `cacheControl` explícito**, portanto vale o default do Storage.
Conforme escopo, isso foi apenas documentado — nenhum bucket, política ou código
de Storage foi alterado.

### 6.1 Gargalo remanescente G3 — dupla consulta a `photos`
Os renderizadores de tema buscam **todas** as fotos (galeria + `og:image`) e o
`useHeroMedia` busca a foto principal separadamente. Unificar exigiria elevar o
estado de `photos` para o contexto ou passar `mainPhoto` por prop para os seis
Heroes, mudando o contrato de dados e o momento de renderização de cada tema.
Isso extrapola o critério "preserva comportamento" desta etapa e fica registrado
para uma etapa dedicada.

### 6.2 Limitações arquiteturais
- **Waterfall de 3 níveis**: só é eliminável com injeção server-side
  (`<link rel="preload">` da Hero no HTML), o que depende do Edge Renderer —
  atualmente em **congelamento arquitetural** (`docs/edge-seo.md`).
- **Bundle client-side**: SPA Vite; o primeiro byte de dados depende do JS.

### 6.3 Recomendações para etapa futura de infraestrutura (não implementadas)
1. Supabase Image Transformations (`width`, `quality`, `format=webp/avif`) —
   **não assumir disponibilidade**; depende de plano/configuração e pode retornar
   400/403. Nada foi adicionado às URLs.
2. `cacheControl` explícito no upload (e/ou política de cache do bucket).
3. `<link rel="preload">` dinâmico da imagem Hero via Edge Renderer.
4. Redimensionamento/compressão na CDN.

## 7. Arquivos modificados

- `src/components/wedding/HeroSection.tsx`
- `src/components/wedding/HeroEditorial.tsx`
- `docs/critical-rendering-path-1.25.21.md` (novo)

## 8. Arquivos e camadas explicitamente não alterados

Worker · Edge SEO · JSON-LD · `src/lib/seo/*` · `src/lib/publicImage.ts` ·
banco de dados · Supabase (projeto, RLS, Edge Functions) · Auth · RSVP ·
Storage · Buckets · DNS · domínio · `index.html`.

## 9. Validação

- `bunx tsgo` (typecheck) — sem erros.
- `bun run build` (build de produção) — sucesso.

A validação é **estática** (typecheck + build). Nenhuma medição de Lighthouse,
tempo de rede ou métrica de navegador foi realizada ou estimada.
