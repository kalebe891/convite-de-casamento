/**
 * Testes da camada de consulta pública (Etapa 1.25.8).
 *
 * Executáveis com `bun test worker/src/data/fetchTenant.test.ts`.
 * Sem rede real: usam stubs controlados de `fetch`.
 */
import { describe, it, expect } from "bun:test";
import {
  fetchTenantForSeo,
  TENANT_SEO_COLUMNS,
  PHOTO_SEO_COLUMNS,
  type FetchTenantEnv,
} from "./fetchTenant";
import { buildRenderInputFromTenant } from "../seo/render";

const ENV: FetchTenantEnv = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-secret-value",
};

type Call = { url: string; init: RequestInit };

function makeFetch(handlers: Array<(call: Call) => Response | Promise<Response>>) {
  const calls: Call[] = [];
  let i = 0;
  const impl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    const call: Call = { url, init };
    calls.push(call);
    const handler = handlers[Math.min(i, handlers.length - 1)];
    i++;
    return handler(call);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const WEDDING_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "ana-e-joao",
  event_type: "wedding",
  bride_name: "Ana",
  groom_name: "João",
  wedding_date: "2026-07-12",
  venue_name: "Salão Nobre",
  venue_address: "Rua X, 100, São Paulo, SP",
};

const BIRTHDAY_ROW = {
  id: "22222222-2222-2222-2222-222222222222",
  slug: "maria-30",
  event_type: "birthday",
  bride_name: "Maria",
  groom_name: null,
  wedding_date: "2026-08-01",
  venue_name: null,
  venue_address: null,
};

describe("fetchTenantForSeo", () => {
  it("1) tenant válido de casamento — devolve dados normalizados + mainPhoto absoluta", async () => {
    const { impl, calls } = makeFetch([
      () => json([WEDDING_ROW]),
      () => json([{ photo_url: "wedding-1/main.jpg", is_main: true }]),
    ]);
    const r = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: impl });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.tenant.slug).toBe("ana-e-joao");
    expect(r.tenant.event_type).toBe("wedding");
    expect(r.tenant.bride_name).toBe("Ana");
    expect(r.mainPhoto).toBe(
      "https://project.supabase.co/storage/v1/object/public/wedding-photos/wedding-1/main.jpg",
    );

    // 10) somente colunas necessárias — nunca "select=*"
    for (const c of calls) {
      expect(c.url.includes("select=*")).toBe(false);
    }
    expect(calls[0].url).toContain(`select=${TENANT_SEO_COLUMNS.join("%2C")}`);
    expect(calls[1].url).toContain(`select=${PHOTO_SEO_COLUMNS.join("%2C")}`);
    expect(calls[0].url).toContain("slug=eq.ana-e-joao");
    expect(calls[0].url).toContain("event_type=eq.wedding");
    expect(calls[0].url).toContain("limit=1");

    // compatível com o renderer da Etapa 1.25.7
    const rendered = buildRenderInputFromTenant(r.tenant, r.mainPhoto);
    expect(rendered.title).toContain("Ana");
    expect(rendered.canonical.startsWith("https://")).toBe(true);
  });

  it("2) tenant válido de aniversário", async () => {
    const { impl } = makeFetch([
      () => json([BIRTHDAY_ROW]),
      () => json([]),
    ]);
    const r = await fetchTenantForSeo("aniversario", "maria-30", ENV, { fetchImpl: impl });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.tenant.event_type).toBe("birthday");
    expect(r.mainPhoto).toBeNull();
  });

  it("3) tenant inexistente — not_found (sem chamada a photos)", async () => {
    const { impl, calls } = makeFetch([() => json([])]);
    const r = await fetchTenantForSeo("casamento", "nao-existe", ENV, { fetchImpl: impl });
    expect(r.status).toBe("not_found");
    expect(calls.length).toBe(1);
  });

  it("4) event type inválido — invalid_params sem chamar rede", async () => {
    const { impl, calls } = makeFetch([() => json([WEDDING_ROW])]);
    const r = await fetchTenantForSeo("wedding" as unknown as string, "x", ENV, { fetchImpl: impl });
    expect(r.status).toBe("invalid_params");
    expect(calls.length).toBe(0);
  });

  it("5) slug vazio / inválido / reservado — invalid_params sem chamar rede", async () => {
    const { impl, calls } = makeFetch([() => json([])]);
    const empty = await fetchTenantForSeo("casamento", "   ", ENV, { fetchImpl: impl });
    expect(empty.status).toBe("invalid_params");
    if (empty.status === "invalid_params") expect(empty.reason).toBe("missing_slug");

    const bad = await fetchTenantForSeo("casamento", "com espaço!", ENV, { fetchImpl: impl });
    expect(bad.status).toBe("invalid_params");
    if (bad.status === "invalid_params") expect(bad.reason).toBe("invalid_slug");

    const reserved = await fetchTenantForSeo("casamento", "admin", ENV, { fetchImpl: impl });
    expect(reserved.status).toBe("invalid_params");
    if (reserved.status === "invalid_params") expect(reserved.reason).toBe("reserved_slug");

    expect(calls.length).toBe(0);
  });

  it("6) ausência de foto principal — ok com mainPhoto=null", async () => {
    const { impl } = makeFetch([
      () => json([WEDDING_ROW]),
      () => json([]),
    ]);
    const r = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: impl });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.mainPhoto).toBeNull();
  });

  it("7) resposta de erro do Supabase — status error, sem vazar credenciais", async () => {
    const { impl } = makeFetch([() => new Response("boom", { status: 500 })]);
    const r = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: impl });
    expect(r.status).toBe("error");
    // 12) resultado é uma tag discriminada; não carrega mensagens/credenciais
    expect(JSON.stringify(r).includes(ENV.SUPABASE_ANON_KEY!)).toBe(false);
  });

  it("8) timeout — status timeout via AbortController", async () => {
    const { impl } = makeFetch([
      (call) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = call.init.signal as AbortSignal | undefined;
          signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            (err as { name?: string }).name = "AbortError";
            reject(err);
          });
        }),
    ]);
    const r = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, {
      fetchImpl: impl,
      timeoutMs: 10,
    });
    expect(r.status).toBe("timeout");
  });

  it("8b) timeout apenas na foto — mantém tenant, mainPhoto=null", async () => {
    const { impl } = makeFetch([
      () => json([WEDDING_ROW]),
      (call) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = call.init.signal as AbortSignal | undefined;
          signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            (err as { name?: string }).name = "AbortError";
            reject(err);
          });
        }),
    ]);
    const r = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, {
      fetchImpl: impl,
      timeoutMs: 20,
    });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.mainPhoto).toBeNull();
  });

  it("9) resposta inválida / incompleta — status error", async () => {
    const bad1 = makeFetch([() => new Response("not json", { status: 200 })]);
    const r1 = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: bad1.impl });
    expect(r1.status).toBe("error");

    // linha sem id/slug
    const bad2 = makeFetch([() => json([{ event_type: "wedding" }])]);
    const r2 = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: bad2.impl });
    expect(r2.status).toBe("error");

    // event_type divergente do pedido — trata como não encontrado
    const bad3 = makeFetch([() => json([{ ...WEDDING_ROW, event_type: "birthday" }])]);
    const r3 = await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: bad3.impl });
    expect(r3.status).toBe("not_found");
  });

  it("11) não depende do cliente Supabase do frontend — usa fetch e envia headers apikey/Authorization", async () => {
    const { impl, calls } = makeFetch([
      () => json([WEDDING_ROW]),
      () => json([]),
    ]);
    await fetchTenantForSeo("casamento", "ana-e-joao", ENV, { fetchImpl: impl });
    const headers = (calls[0].init.headers ?? {}) as Record<string, string>;
    expect(headers.apikey).toBe(ENV.SUPABASE_ANON_KEY);
    expect(headers.Authorization).toBe(`Bearer ${ENV.SUPABASE_ANON_KEY}`);
  });

  it("config ausente — config_error sem chamada de rede", async () => {
    const { impl, calls } = makeFetch([() => json([])]);
    const r = await fetchTenantForSeo("casamento", "ana-e-joao", {}, { fetchImpl: impl });
    expect(r.status).toBe("config_error");
    expect(calls.length).toBe(0);
  });
});
