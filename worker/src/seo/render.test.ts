/**
 * Testes do Edge SEO Renderer (Etapa 1.25.7).
 *
 * Executáveis com `bun test worker/src/seo/render.test.ts` — não requerem
 * dependências adicionais; usam apenas `bun:test` (compatível com node:test).
 */
import { describe, it, expect } from "bun:test";
import {
  escapeHtml,
  injectSeoBlock,
  renderSeoBlock,
  renderTenantSeo,
  buildRenderInputFromTenant,
  SEO_BLOCK_START,
  SEO_BLOCK_END,
  type RenderSeoInput,
} from "./render";

const BASE_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Placeholder</title>
</head><body><div id="root"></div></body></html>`;

const SEO: RenderSeoInput = {
  title: "Ana & João | Convite de Casamento",
  description: "12 de Julho de 2026 • São Paulo. Confira nosso convite digital.",
  canonical: "https://convite-de-evento.lovable.app/casamento/ana-joao",
  ogUrl: "https://convite-de-evento.lovable.app/casamento/ana-joao",
  ogType: "event",
  image: "https://example.com/photo.jpg",
  twitterCard: "summary_large_image",
};

function countOccurrences(hay: string, needle: string): number {
  let n = 0;
  let i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) {
    n += 1;
    i += needle.length;
  }
  return n;
}

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeHtml(`A & B <script>"x"'y'</script>`)).toBe(
      "A &amp; B &lt;script&gt;&quot;x&quot;&#39;y&#39;&lt;/script&gt;",
    );
  });
  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("renderSeoBlock", () => {
  it("emits all supported tags when values are present", () => {
    const block = renderSeoBlock(SEO);
    expect(block.startsWith(SEO_BLOCK_START)).toBe(true);
    expect(block.endsWith(SEO_BLOCK_END)).toBe(true);
    expect(block).toContain("<title>Ana &amp; João | Convite de Casamento</title>");
    expect(block).toContain(`<meta name="description" content=`);
    expect(block).toContain(`<link rel="canonical" href="https://convite-de-evento.lovable.app/casamento/ana-joao"`);
    expect(block).toContain(`<meta property="og:title"`);
    expect(block).toContain(`<meta property="og:description"`);
    expect(block).toContain(`<meta property="og:url"`);
    expect(block).toContain(`<meta property="og:type" content="event"`);
    expect(block).toContain(`<meta property="og:image" content="https://example.com/photo.jpg"`);
    expect(block).toContain(`<meta name="twitter:card" content="summary_large_image"`);
    expect(block).toContain(`<meta name="twitter:title"`);
    expect(block).toContain(`<meta name="twitter:description"`);
    expect(block).toContain(`<meta name="twitter:image"`);
  });

  it("omits tags whose values are missing (no undefined/null in output)", () => {
    const block = renderSeoBlock({
      title: "",
      description: "",
      canonical: "",
      ogUrl: "",
      image: null,
    });
    expect(block).not.toContain("undefined");
    expect(block).not.toContain("null");
    expect(block).not.toContain("<title>");
    expect(block).not.toContain("og:image");
    expect(block).not.toContain("twitter:image");
    // og:type e twitter:card têm defaults, sempre presentes:
    expect(block).toContain(`og:type" content="website"`);
    expect(block).toContain(`twitter:card" content="summary_large_image"`);
  });

  it("escapes malicious content (no new tags can be injected)", () => {
    const evil: RenderSeoInput = {
      title: `</title><script>alert(1)</script>`,
      description: `" onclick="alert(1)`,
      canonical: `https://x.test/"><script>bad()</script>`,
      ogUrl: `https://x.test/'"`,
      image: `https://x.test/img.jpg"><script>x()</script>`,
    };
    const block = renderSeoBlock(evil);
    // Nenhum bloco <script> real deve existir
    expect(block).not.toContain("<script>");
    expect(block).not.toContain("</script>");
    // Nenhum atributo extra injetado — só aspas escapadas
    expect(block).toContain("&lt;script&gt;");
    expect(block).toContain("&quot;");
  });
});

describe("injectSeoBlock", () => {
  it("inserts before </head> when no marker exists", () => {
    const out = renderTenantSeo(BASE_HTML, SEO);
    expect(out).toContain(SEO_BLOCK_START);
    expect(out).toContain(SEO_BLOCK_END);
    expect(out.indexOf(SEO_BLOCK_END)).toBeLessThan(out.indexOf("</head>"));
  });

  it("is idempotent under repeated calls with the same input", () => {
    const once = renderTenantSeo(BASE_HTML, SEO);
    const twice = renderTenantSeo(once, SEO);
    const thrice = renderTenantSeo(twice, SEO);
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
    expect(countOccurrences(thrice, SEO_BLOCK_START)).toBe(1);
    expect(countOccurrences(thrice, SEO_BLOCK_END)).toBe(1);
  });

  it("replaces a previous block instead of appending a new one", () => {
    const first = renderTenantSeo(BASE_HTML, SEO);
    const updated = renderTenantSeo(first, {
      ...SEO,
      title: "Novo Título",
      description: "Nova descrição",
    });
    expect(countOccurrences(updated, SEO_BLOCK_START)).toBe(1);
    expect(updated).toContain("Novo Título");
    expect(updated).not.toContain("Ana &amp; João | Convite de Casamento");
  });

  it("preserves absolute canonical and image URLs verbatim", () => {
    const out = renderTenantSeo(BASE_HTML, SEO);
    expect(out).toContain(`href="https://convite-de-evento.lovable.app/casamento/ana-joao"`);
    expect(out).toContain(`content="https://example.com/photo.jpg"`);
  });

  it("returns HTML unchanged when there is no </head> and no marker", () => {
    const noHead = "<html><body>hi</body></html>";
    expect(renderTenantSeo(noHead, SEO)).toBe(noHead);
  });

  it("handles empty/invalid HTML deterministically", () => {
    expect(renderTenantSeo("", SEO)).toBe("");
    // @ts-expect-error — validating runtime safety with non-string input
    expect(renderTenantSeo(null, SEO)).toBe("");
  });
});

describe("buildRenderInputFromTenant", () => {
  it("composes absolute URLs from the isomorphic layer", () => {
    const input = buildRenderInputFromTenant(
      {
        slug: "ana-joao",
        event_type: "wedding",
        wedding_date: "2026-07-12",
        venue_address: "Rua X, São Paulo, SP",
        bride_name: "Ana",
        groom_name: "João",
      } as any,
      "/storage/photo.jpg",
      "https://convite-de-evento.lovable.app",
    );
    expect(input.canonical.startsWith("https://convite-de-evento.lovable.app/")).toBe(true);
    expect(input.canonical).toBe(input.ogUrl);
    expect(input.image).toBe("https://convite-de-evento.lovable.app/storage/photo.jpg");
    expect(input.ogType).toBe("event");
  });

  it("keeps already-absolute image URLs untouched", () => {
    const input = buildRenderInputFromTenant(
      { slug: "s", event_type: "wedding" } as any,
      "https://cdn.example/x.jpg",
    );
    expect(input.image).toBe("https://cdn.example/x.jpg");
  });
});
