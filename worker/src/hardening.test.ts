/**
 * Etapa 1.25.11 — Testes de hardening.
 *
 * Cobrem apenas invariantes introduzidas/reforçadas nesta etapa:
 *  - Health check é determinístico e não depende de env externa.
 *  - Ausência de `FRONTEND_ORIGIN` produz erro seguro (sem vazamento).
 *  - Destino do proxy é imutável: query/header do cliente não podem
 *    redirecionar o fetch da origem para outro host.
 *  - Respostas de erro não expõem secrets.
 *
 * Não duplicam os testes das etapas anteriores.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleRequest, type HandlerEnv } from "./handleRequest";

const ORIGINAL_FETCH = globalThis.fetch;

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response,
) {
  (globalThis as any).fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(input, init))) as typeof fetch;
}

beforeEach(() => {
  (globalThis as any).fetch = ORIGINAL_FETCH;
});
afterEach(() => {
  (globalThis as any).fetch = ORIGINAL_FETCH;
});

describe("hardening — health check", () => {
  it("responde sem consultar origem nem Supabase", async () => {
    let called = false;
    installFetch(async () => {
      called = true;
      return new Response("should not be called", { status: 500 });
    });

    const env: HandlerEnv = {}; // sem FRONTEND_ORIGIN, sem Supabase
    const res = await handleRequest(
      new Request("https://edge.example/__edge/health"),
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, service: "edge-seo-renderer" });
    expect(called).toBe(false);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("hardening — configuração ausente", () => {
  it("retorna 500 seguro quando FRONTEND_ORIGIN não está configurado", async () => {
    installFetch(async () => new Response("nope", { status: 200 }));
    const res = await handleRequest(
      new Request("https://edge.example/casamento/algum-slug"),
      {} as HandlerEnv,
    );
    expect(res.status).toBe(500);
    const text = await res.text();
    // Mensagem genérica; não expõe nomes de variáveis Supabase nem valores.
    expect(text.toLowerCase()).not.toContain("supabase");
    expect(text.toLowerCase()).not.toContain("anon");
    expect(text.toLowerCase()).not.toContain("key");
  });
});

describe("hardening — proxy não aceita destino arbitrário", () => {
  it("ignora query string ?origin= e usa apenas FRONTEND_ORIGIN configurado", async () => {
    const seen: string[] = [];
    installFetch(async (input) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      seen.push(u);
      return new Response("<html><head></head><body>ok</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });

    const env: HandlerEnv = {
      FRONTEND_ORIGIN: "https://trusted.internal",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
    };

    await handleRequest(
      new Request(
        "https://edge.example/casamento/foo?origin=https://evil.example&url=https://evil.example",
        { headers: { host: "evil.example", "x-forwarded-host": "evil.example" } },
      ),
      env,
    );

    // Todo fetch de origem deve começar por FRONTEND_ORIGIN, nunca por evil.example.
    const originFetches = seen.filter((u) => !u.includes("supabase.co"));
    expect(originFetches.length).toBeGreaterThan(0);
    for (const u of originFetches) {
      expect(u.startsWith("https://trusted.internal/")).toBe(true);
      expect(u).not.toContain("evil.example");
    }
  });

  it("não encaminha Authorization/Cookie do cliente para a origem", async () => {
    let forwardedHeaders: Headers | null = null;
    installFetch(async (input, init) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!u.includes("supabase.co")) {
        forwardedHeaders = new Headers(init?.headers ?? {});
      }
      return new Response("<html><head></head><body>ok</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });

    const env: HandlerEnv = {
      FRONTEND_ORIGIN: "https://trusted.internal",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
    };

    await handleRequest(
      new Request("https://edge.example/casamento/foo", {
        headers: {
          authorization: "Bearer client-secret",
          cookie: "session=abc",
          "x-api-key": "leak-me",
        },
      }),
      env,
    );

    expect(forwardedHeaders).not.toBeNull();
    const h = forwardedHeaders as unknown as Headers;
    expect(h.get("authorization")).toBeNull();
    expect(h.get("cookie")).toBeNull();
    expect(h.get("x-api-key")).toBeNull();
  });
});
