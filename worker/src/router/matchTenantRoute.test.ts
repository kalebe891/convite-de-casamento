import { describe, it, expect } from "bun:test";
import { matchTenantRoute } from "./matchTenantRoute";

describe("matchTenantRoute", () => {
  it("matches /:eventType/:slug for casamento", () => {
    expect(matchTenantRoute("/casamento/lucas-e-fernanda")).toEqual({
      eventType: "casamento",
      slug: "lucas-e-fernanda",
    });
  });

  it("matches /:eventType/:slug for aniversario", () => {
    expect(matchTenantRoute("/aniversario/maria-15-anos")).toEqual({
      eventType: "aniversario",
      slug: "maria-15-anos",
    });
  });

  it("rejects root", () => {
    expect(matchTenantRoute("/")).toBeNull();
  });

  it("rejects single segment", () => {
    expect(matchTenantRoute("/casamento")).toBeNull();
    expect(matchTenantRoute("/aniversario")).toBeNull();
  });

  it("rejects invalid eventType", () => {
    expect(matchTenantRoute("/foo/bar")).toBeNull();
  });

  it("rejects three or more segments", () => {
    expect(matchTenantRoute("/casamento/lucas/admin")).toBeNull();
    expect(matchTenantRoute("/casamento/lucas/rsvp")).toBeNull();
  });

  it("rejects convite as slug", () => {
    expect(matchTenantRoute("/casamento/convite")).toBeNull();
    expect(matchTenantRoute("/aniversario/convite")).toBeNull();
  });

  it("rejects admin path", () => {
    expect(matchTenantRoute("/admin")).toBeNull();
    expect(matchTenantRoute("/admin/users")).toBeNull();
  });

  it("rejects static assets", () => {
    expect(matchTenantRoute("/favicon.ico")).toBeNull();
    expect(matchTenantRoute("/casamento/foo.png")).toBeNull();
  });

  it("rejects invalid slug chars", () => {
    expect(matchTenantRoute("/casamento/UPPER")).toBeNull();
    expect(matchTenantRoute("/casamento/with space")).toBeNull();
  });
});
