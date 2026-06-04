// Gera public/sitemap.xml com rotas institucionais + tenants públicos
// (is_public_showcase = true). Roda em predev/prebuild.
//
// Requer SUPABASE_URL e SUPABASE_ANON_KEY no ambiente (lê de .env).

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://convite-de-evento.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

function loadEnv() {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf-8");
  raw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) return;
    const [, k, v] = m;
    if (!process.env[k]) {
      process.env[k] = v.replace(/^['"]|['"]$/g, "");
    }
  });
}

async function fetchPublicTenants(): Promise<SitemapEntry[]> {
  loadEnv();
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    console.warn("[sitemap] Sem credenciais Supabase — pulando tenants.");
    return [];
  }

  const endpoint = `${url}/rest/v1/wedding_details?select=slug,event_type,updated_at&is_public_showcase=eq.true`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.warn("[sitemap] Falha ao buscar tenants:", res.status);
    return [];
  }
  const rows: Array<{ slug: string; event_type: string; updated_at?: string }> =
    await res.json();
  return rows
    .filter((r) => r.slug)
    .map((r) => ({
      path: `/${r.event_type === "wedding" ? "casamento" : "aniversario"}/${r.slug}`,
      lastmod: r.updated_at?.slice(0, 10),
      changefreq: "weekly",
      priority: "0.7",
    }));
}

function render(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n")
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

(async () => {
  const staticEntries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/casamento", changefreq: "weekly", priority: "0.9" },
    { path: "/aniversario", changefreq: "weekly", priority: "0.9" },
  ];
  const tenantEntries = await fetchPublicTenants();
  const out = render([...staticEntries, ...tenantEntries]);
  writeFileSync(resolve("public/sitemap.xml"), out);
  console.log(
    `sitemap.xml gerado (${staticEntries.length + tenantEntries.length} entradas).`
  );
})();
