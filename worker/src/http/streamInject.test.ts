import { describe, it, expect } from "bun:test";
import {
  injectSeoIntoHtmlStream,
  SEO_BLOCK_START_MARKER,
  SEO_BLOCK_END_MARKER,
} from "./streamInject";

const BLOCK =
  `${SEO_BLOCK_START_MARKER}\n<title>Novo</title>\n${SEO_BLOCK_END_MARKER}`;

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder("utf-8");
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  out += dec.decode();
  return out;
}

describe("injectSeoIntoHtmlStream", () => {
  it("injects before </head> in a single chunk", async () => {
    const html = "<!doctype html><html><head><title>Old</title></head><body>x</body></html>";
    const result = await collect(injectSeoIntoHtmlStream(streamOf([html]), BLOCK));
    expect(result).toContain(BLOCK);
    expect(result.indexOf(BLOCK)).toBeLessThan(result.indexOf("</head>"));
    expect(result).toContain("<body>x</body>");
  });

  it("injects when </head> is uppercase/mixed case", async () => {
    const html = "<html><HEAD><title>Old</title></HEAD><body/></html>";
    const result = await collect(injectSeoIntoHtmlStream(streamOf([html]), BLOCK));
    expect(result).toContain(BLOCK);
    expect(result).toContain("</HEAD>");
  });

  it("injects when </head> is split across chunks", async () => {
    const chunks = [
      "<html><head><title>Old</title></hea",
      "d><body>ok</body></html>",
    ];
    const result = await collect(injectSeoIntoHtmlStream(streamOf(chunks), BLOCK));
    expect(result).toContain(BLOCK);
    expect(result).toContain("<body>ok</body>");
    // Injection is a single insertion; no duplicate blocks.
    const occurrences = result.split(SEO_BLOCK_START_MARKER).length - 1;
    expect(occurrences).toBe(1);
  });

  it("replaces existing SEO block (idempotent)", async () => {
    const html =
      `<html><head><meta charset="utf-8">${SEO_BLOCK_START_MARKER}<title>Antigo</title>${SEO_BLOCK_END_MARKER}<link/></head><body/></html>`;
    const result = await collect(injectSeoIntoHtmlStream(streamOf([html]), BLOCK));
    expect(result).not.toContain("<title>Antigo</title>");
    expect(result).toContain(BLOCK);
    const occurrences = result.split(SEO_BLOCK_START_MARKER).length - 1;
    expect(occurrences).toBe(1);
  });

  it("is idempotent when re-run over its own output", async () => {
    const html = "<html><head></head><body/></html>";
    const first = await collect(injectSeoIntoHtmlStream(streamOf([html]), BLOCK));
    const second = await collect(injectSeoIntoHtmlStream(streamOf([first]), BLOCK));
    expect(second).toBe(first);
  });

  it("passes through unchanged when </head> is absent", async () => {
    const html = "<html><body>no head here</body></html>";
    const result = await collect(injectSeoIntoHtmlStream(streamOf([html]), BLOCK));
    expect(result).toBe(html);
  });

  it("respects buffer limit and falls back", async () => {
    // Head huge o suficiente para estourar limite baixo.
    const filler = "a".repeat(5000);
    const html = `<html><head>${filler}</head><body/></html>`;
    const result = await collect(
      injectSeoIntoHtmlStream(streamOf([html]), BLOCK, { maxScanChars: 1024 }),
    );
    expect(result).toContain(filler);
    // Fallback: sem injeção.
    expect(result).not.toContain(BLOCK);
  });

  it("does not corrupt multi-byte utf-8 split across chunks", async () => {
    const enc = new TextEncoder();
    const full = "<html><head></head><body>café ☕</body></html>";
    const bytes = enc.encode(full);
    // Split at index that lands in the middle of "é".
    const idx = full.indexOf("é");
    const bytePos = enc.encode(full.slice(0, idx + 1)).length - 1;
    const a = bytes.slice(0, bytePos);
    const b = bytes.slice(bytePos);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(a);
        c.enqueue(b);
        c.close();
      },
    });
    const result = await collect(injectSeoIntoHtmlStream(stream, BLOCK));
    expect(result).toContain("café ☕");
    expect(result).toContain(BLOCK);
  });
});
