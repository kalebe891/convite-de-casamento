import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleRequest, type HandlerEnv } from "./handleRequest";

const ENV: HandlerEnv = {
  FRONTEND_ORIGIN: "https://origin.internal",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
};

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response;

const originalFetch = globalThis.fetch;

function installFetch(handler: FetchHandler) {
  (globalThis as any).fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(input, init))) as typeof fetch;
}

beforeEach(() => {
  (globalThis as any).fetch = originalFetch;
});
afterEach(() => {
  (globalThis as any).fetch = originalFetch;
});

function jsonResp(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function htmlResp(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

const TENANT_ROW = {
  id: "tid-1",
  slug: "lucas-e-fernanda",
  event_type: "wedding",
  bride_name: "Fernanda",
  groom_name: "Lucas",
  wedding_date: "2026-05-10",
  venue_name: "Salão X",
  venue_address: "Rua Y, São Paulo, SP",
};

function makeSupabaseTenantHandler(): FetchHandler {
  return (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/rest/v1/wedding_details")) return jsonResp([TENANT_ROW]);
    if (url.includes("/rest/v1/photos")) return jsonResp([]);
    throw new Error("unexpected supabase call: " + url);
  };
}

describe("handleRequest — health", () => {
  it("responds without touching origin or supabase", async () => {
    installFetch(() => {
      throw new Error("must not be called");
    });
    const res = await handleRequest(
      new Request("http://worker.local/__edge/health"),
      ENV,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
  });
});

describe("handleRequest — eligible tenant route", () => {
  it("injects SEO for /casamento/:slug", async () => {
    const supabase = makeSupabaseTenantHandler();
    installFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        return htmlResp(
          "<html><head><title>Old</title></head><body>App</body></html>",
        );
      }
      return supabase(input, init);
    });

    const res = await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda"),
      ENV,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("content-length")).toBeNull();
    const text = await res.text();
    expect(text).toContain("<!--LOVABLE_SEO_START-->");
    expect(text).toContain("<!--LOVABLE_SEO_END-->");
    expect(text).toContain("Fernanda");
    expect(text).toContain("<body>App</body>");
  });

  it("passes through when tenant not found", async () => {
    installFetch((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        return htmlResp("<html><head></head><body/></html>");
      }
      if (url.includes("wedding_details")) return jsonResp([]);
      if (url.includes("photos")) return jsonResp([]);
      throw new Error("unexpected: " + url);
    });
    const res = await handleRequest(
      new Request("http://worker.local/casamento/nao-existe"),
      ENV,
    );
    const text = await res.text();
    expect(text).not.toContain("<!--LOVABLE_SEO_START-->");
  });

  it("passes through when supabase errors", async () => {
    installFetch((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        return htmlResp("<html><head></head><body/></html>");
      }
      return new Response("boom", { status: 500 });
    });
    const res = await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda"),
      ENV,
    );
    const text = await res.text();
    expect(text).not.toContain("<!--LOVABLE_SEO_START-->");
    expect(res.status).toBe(200);
  });

  it("does not transform JSON responses from origin", async () => {
    installFetch((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        return jsonResp({ hello: "world" });
      }
      if (url.includes("wedding_details")) return jsonResp([TENANT_ROW]);
      if (url.includes("photos")) return jsonResp([]);
      throw new Error("unexpected: " + url);
    });
    const res = await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda"),
      ENV,
    );
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { hello: string };
    expect(body.hello).toBe("world");
  });

  it("preserves 404 status from origin", async () => {
    installFetch((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        return htmlResp("<html><head></head><body>404</body></html>", { status: 404 });
      }
      if (url.includes("wedding_details")) return jsonResp([TENANT_ROW]);
      if (url.includes("photos")) return jsonResp([]);
      throw new Error("unexpected: " + url);
    });
    const res = await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda"),
      ENV,
    );
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toContain("<!--LOVABLE_SEO_START-->");
  });

  it("preserves query string when fetching origin", async () => {
    let seenUrl = "";
    installFetch((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        seenUrl = url;
        return htmlResp("<html><head></head><body/></html>");
      }
      if (url.includes("wedding_details")) return jsonResp([TENANT_ROW]);
      if (url.includes("photos")) return jsonResp([]);
      throw new Error("unexpected: " + url);
    });
    await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda?utm=abc"),
      ENV,
    );
    expect(seenUrl).toBe("https://origin.internal/casamento/lucas-e-fernanda?utm=abc");
  });

  it("strips sensitive headers before contacting origin", async () => {
    let receivedAuth: string | null = "unset";
    let receivedCookie: string | null = "unset";
    installFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        const h = new Headers(init?.headers);
        receivedAuth = h.get("authorization");
        receivedCookie = h.get("cookie");
        return htmlResp("<html><head></head><body/></html>");
      }
      if (url.includes("wedding_details")) return jsonResp([TENANT_ROW]);
      if (url.includes("photos")) return jsonResp([]);
      throw new Error("unexpected: " + url);
    });
    await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda", {
        headers: { authorization: "Bearer LEAK", cookie: "s=xyz" },
      }),
      ENV,
    );
    expect(receivedAuth).toBeNull();
    expect(receivedCookie).toBeNull();
  });
});

describe("handleRequest — non-eligible / non-GET", () => {
  it("passes /admin through without SEO", async () => {
    let supabaseCalled = false;
    installFetch((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("supabase")) supabaseCalled = true;
      if (url.startsWith("https://origin.internal")) {
        return htmlResp("<html><head></head><body>admin</body></html>");
      }
      throw new Error("unexpected: " + url);
    });
    const res = await handleRequest(new Request("http://worker.local/admin"), ENV);
    const text = await res.text();
    expect(supabaseCalled).toBe(false);
    expect(text).not.toContain("<!--LOVABLE_SEO_START-->");
  });

  it("does not process POST as SEO", async () => {
    let originMethod = "";
    let supabaseCalled = false;
    installFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("supabase")) supabaseCalled = true;
      if (url.startsWith("https://origin.internal")) {
        originMethod = (init?.method ?? "GET").toUpperCase();
        return new Response("{}", { status: 200 });
      }
      throw new Error("unexpected: " + url);
    });
    await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda", {
        method: "POST",
        body: "x",
      }),
      ENV,
    );
    expect(originMethod).toBe("POST");
    expect(supabaseCalled).toBe(false);
  });

  it("HEAD does not consume/transform body", async () => {
    let originMethod = "";
    installFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://origin.internal")) {
        originMethod = (init?.method ?? "GET").toUpperCase();
        return new Response(null, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      throw new Error("unexpected: " + url);
    });
    const res = await handleRequest(
      new Request("http://worker.local/casamento/lucas-e-fernanda", {
        method: "HEAD",
      }),
      ENV,
    );
    expect(originMethod).toBe("HEAD");
    expect(res.status).toBe(200);
  });
});
