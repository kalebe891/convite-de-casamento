/**
 * Etapa 1.24.15.02 — listener DEDICADO só para diagnóstico da sequência de eventos do Supabase Auth.
 * Não altera estado da aplicação. Apenas registra a ordem exata dos eventos
 * (INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED / SIGNED_OUT / PASSWORD_RECOVERY).
 */
import { supabase } from "@/integrations/supabase/client";
import { diag, diagCount } from "@/lib/diag";

let installed = false;
export function installAuthEventDiag() {
  if (installed) return;
  installed = true;

  diag("AuthEventDiag", "installing diagnostic-only listener");
  supabase.auth.onAuthStateChange((event, session) => {
    diagCount("AuthEventDiag", `event:${event}`);
    diag("AuthEventDiag", `event=${event} hasUser=${!!session?.user} expires_at=${session?.expires_at ?? "n/a"}`);
  });

  // Detectar setInterval/setTimeout suspeitos criados após a instalação
  const origSetInterval = window.setInterval.bind(window);
  (window as any).setInterval = ((handler: any, timeout?: number, ...rest: any[]) => {
    const id = origSetInterval(handler, timeout, ...rest);
    diag("AuthEventDiag", `setInterval registered id=${id} timeout=${timeout}ms`);
    return id;
  }) as typeof window.setInterval;
}
