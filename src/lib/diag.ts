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
