/**
 * Etapa 1.25.9 — Transformador streaming para injeção do bloco SEO.
 *
 * Recebe o body de uma resposta HTML já decodificada (o runtime Cloudflare
 * entrega bytes descomprimidos quando lemos `response.body` diretamente).
 * Nunca acumula o documento inteiro em memória: mantém apenas uma janela
 * limitada até localizar `</head>` (case-insensitive) ou o bloco delimitado
 * `<!--LOVABLE_SEO_START-->...<!--LOVABLE_SEO_END-->` já existente.
 *
 * Se nenhum ponto de injeção for encontrado dentro do limite, aplica
 * fallback seguro: emite o conteúdo tal como recebido, sem tentar reescrever.
 *
 * NÃO usa `response.text()`, NÃO usa `String.replace` sobre o documento
 * completo e NÃO faz regex global sobre o HTML.
 */

export const SEO_BLOCK_START_MARKER = "<!--LOVABLE_SEO_START-->";
export const SEO_BLOCK_END_MARKER = "<!--LOVABLE_SEO_END-->";

export interface InjectStreamOptions {
  /**
   * Limite (em caracteres UTF-16 do buffer) que o transformador aguarda
   * antes de desistir e emitir o conteúdo sem injeção. 256 KiB é folgado
   * para qualquer `<head>` legítimo de SPA Vite.
   */
  maxScanChars?: number;
  /**
   * Quantidade de caracteres retidos entre chunks para permitir que um
   * marcador (`</head>` ou `<!--LOVABLE_SEO_END-->`) caia em fronteira
   * entre dois chunks. Deve ser maior que o maior marcador procurado.
   */
  overlapChars?: number;
}

const DEFAULT_MAX_SCAN = 256 * 1024;
const DEFAULT_OVERLAP = 64;

/**
 * Cria um `ReadableStream` que emite o HTML original com o bloco SEO
 * injetado (ou substituído, se já houver um bloco delimitado).
 *
 * Regras:
 *  - Se o buffer contiver `<!--LOVABLE_SEO_START-->...<!--LOVABLE_SEO_END-->`,
 *    substitui exatamente esse trecho (idempotente).
 *  - Caso contrário, insere `block + "\n"` imediatamente antes da primeira
 *    ocorrência de `</head>` (case-insensitive).
 *  - Se nenhuma âncora aparecer dentro de `maxScanChars`, emite o conteúdo
 *    sem alteração.
 */
export function injectSeoIntoHtmlStream(
  body: ReadableStream<Uint8Array>,
  block: string,
  options: InjectStreamOptions = {},
): ReadableStream<Uint8Array> {
  const maxScan = options.maxScanChars ?? DEFAULT_MAX_SCAN;
  const overlap = Math.max(
    options.overlapChars ?? DEFAULT_OVERLAP,
    SEO_BLOCK_END_MARKER.length + 4,
  );

  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  let buffered = "";
  let scanned = 0;
  let injected = false;
  // Quando detectamos SEO_BLOCK_START mas ainda não SEO_BLOCK_END, ficamos
  // segurando o buffer até fechar (dentro do limite).
  let waitingForExistingEnd = false;

  const transformer = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Sempre decodifica pelo mesmo decoder para não perder bytes
      // multi-byte pendentes na fronteira de chunks.
      const text = decoder.decode(chunk, { stream: true });
      if (injected) {
        if (text) controller.enqueue(encoder.encode(text));
        return;
      }
      buffered += text;
      scanned += text.length;

      // 1) Bloco SEO delimitado já presente → substituir.
      if (!waitingForExistingEnd) {
        const startIdx = buffered.indexOf(SEO_BLOCK_START_MARKER);
        if (startIdx !== -1) {
          waitingForExistingEnd = true;
        }
      }
      if (waitingForExistingEnd) {
        const startIdx = buffered.indexOf(SEO_BLOCK_START_MARKER);
        const endIdx =
          startIdx === -1
            ? -1
            : buffered.indexOf(SEO_BLOCK_END_MARKER, startIdx + SEO_BLOCK_START_MARKER.length);
        if (startIdx !== -1 && endIdx !== -1) {
          const stopAt = endIdx + SEO_BLOCK_END_MARKER.length;
          const out =
            buffered.slice(0, startIdx) + block + buffered.slice(stopAt);
          controller.enqueue(encoder.encode(out));
          buffered = "";
          injected = true;
          waitingForExistingEnd = false;
          return;
        }
        // Ainda aguardando END; continuar bufferizando dentro do limite.
        if (scanned > maxScan) {
          controller.enqueue(encoder.encode(buffered));
          buffered = "";
          injected = true;
          waitingForExistingEnd = false;
        }
        return;
      }

      // 2) Procurar </head> incremental e case-insensitive.
      const lower = buffered.toLowerCase();
      const headClose = lower.indexOf("</head>");
      if (headClose !== -1) {
        const out =
          buffered.slice(0, headClose) +
          block +
          "\n" +
          buffered.slice(headClose);
        controller.enqueue(encoder.encode(out));
        buffered = "";
        injected = true;
        return;
      }

      // 3) Não achou ainda. Emitir prefixo seguro; reter janela de overlap.
      if (buffered.length > overlap) {
        const flushTo = buffered.length - overlap;
        controller.enqueue(encoder.encode(buffered.slice(0, flushTo)));
        buffered = buffered.slice(flushTo);
      }

      // 4) Limite estourado → fallback silencioso, sem injeção.
      if (scanned > maxScan) {
        if (buffered) controller.enqueue(encoder.encode(buffered));
        buffered = "";
        injected = true;
      }
    },
    flush(controller) {
      // Fecha o decoder (esvazia estado interno de multi-byte).
      const tail = decoder.decode();
      if (tail) buffered += tail;
      if (buffered) {
        controller.enqueue(encoder.encode(buffered));
        buffered = "";
      }
    },
  });

  return body.pipeThrough(transformer);
}
