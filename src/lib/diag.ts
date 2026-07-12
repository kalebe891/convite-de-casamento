/**
 * Etapa 1.24.15 — Diagnóstico do Loading do Master Admin.
 * Helper para logs padronizados com timestamp relativo ao boot da página.
 * Uso: diag("AuthProvider", "getSession started")
 */
const T0 = typeof performance !== "undefined" ? performance.now() : 0;

export const diag = (scope: string, message: string, extra?: unknown) => {
  const t = Math.round((performance.now() - T0));
  if (extra !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[DIAG 1.24.15] +${t}ms  [${scope}] ${message}`, extra);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[DIAG 1.24.15] +${t}ms  [${scope}] ${message}`);
  }
};

export const diagTimer = (scope: string, label: string) => {
  const start = performance.now();
  diag(scope, `${label} started`);
  return () => {
    const elapsed = Math.round(performance.now() - start);
    diag(scope, `${label} finished (${elapsed}ms)`);
    return elapsed;
  };
};

// Etapa 1.24.15.02 — contador incremental por escopo/rótulo para detectar remontagens e re-renders.
const counters: Record<string, number> = {};
export const diagCount = (scope: string, label: string) => {
  const key = `${scope}::${label}`;
  counters[key] = (counters[key] ?? 0) + 1;
  const t = Math.round(performance.now() - T0);
  // eslint-disable-next-line no-console
  console.log(`[DIAG 1.24.15.02] +${t}ms  [${scope}] ${label} #${counters[key]}`);
  return counters[key];
};

// Etapa 1.24.15.03 — snapshot com detecção de mudança por chave.
const snapshots: Record<string, string> = {};
export const diagSnap = (scope: string, values: Record<string, unknown>) => {
  const snap = Object.entries(values)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  const t = Math.round(performance.now() - T0);
  // eslint-disable-next-line no-console
  console.log(`[DIAG 1.24.15.03] +${t}ms  [${scope}] ${snap}`);
  const prev = snapshots[scope];
  if (prev !== undefined && prev !== snap) {
    const prevMap = Object.fromEntries(prev.split(" ").map((p) => p.split("=")));
    const changes = Object.entries(values)
      .filter(([k, v]) => prevMap[k] !== String(v))
      .map(([k, v]) => `${k}: ${prevMap[k]} → ${v}`)
      .join(" | ");
    // eslint-disable-next-line no-console
    console.log(`[DIAG 1.24.15.03] +${t}ms  [${scope}] CHANGED  ${changes}`);
  }
  snapshots[scope] = snap;
};
