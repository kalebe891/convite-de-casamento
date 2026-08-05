import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useOptionalWedding } from "@/contexts/WeddingContext";
import { getActivationLinkConfig } from "@/lib/activationLink";
import { openWhatsApp } from "@/lib/whatsapp";

/**
 * Etapa 1.28.00 — UX da ativação da base Demo (apenas visual).
 *
 * Usa SOMENTE campos já existentes da base Demo em wedding_details:
 *   is_demo · demo_expires_at · tenant_status
 *
 * Não altera permissões, RLS, roles, auth, cron ou exclusão.
 */
const DemoActivationBanner = () => {
  const weddingContext = useOptionalWedding();
  const wedding = weddingContext?.wedding ?? null;

  const daysLeft = useMemo(() => {
    if (!wedding?.demo_expires_at) return null;
    const t = new Date(wedding.demo_expires_at).getTime();
    if (Number.isNaN(t)) return null;
    return Math.ceil((t - Date.now()) / 86400000);
  }, [wedding?.demo_expires_at]);

  if (!wedding?.is_demo) return null;

  const expired =
    wedding.tenant_status === "archived" || (daysLeft !== null && daysLeft <= 0);

  const handleActivate = () => {
    const { phone, message } = getActivationLinkConfig();
    openWhatsApp(phone, message);
  };

  return (
    <div className="flex items-center gap-3">
      {expired ? (
        <div className="hidden md:block max-w-[260px] text-right">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Período de testes encerrado.
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground/70">
            Este convite será removido permanentemente em 30 dias caso não seja
            ativado.
          </p>
        </div>
      ) : (
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Teste restante
          </p>
          <p className="text-base font-semibold leading-tight tabular-nums">
            {daysLeft !== null ? `${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}` : "—"}
          </p>
        </div>
      )}

      <Button size="sm" onClick={handleActivate}>
        ATIVAR
      </Button>
    </div>
  );
};

export default DemoActivationBanner;
