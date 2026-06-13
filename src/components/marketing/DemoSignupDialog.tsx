import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { themeRegistry, DEFAULT_THEME_ID, type TenantThemeId } from "@/themes/registry";
import { logAdminAction } from "@/lib/adminLogger";
import { buildTenantAdminUrl } from "@/lib/eventType";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Theme id da página que abriu o modal (legacy, editorial, minimal...). */
  currentThemeId?: TenantThemeId;
}

/** Visual preview tokens per theme — pure CSS/SVG, no assets. */
const THEME_PREVIEWS: Record<
  TenantThemeId,
  { bg: string; fg: string; accent: string; font: string; sample: string }
> = {
  legacy: {
    bg: "#fdfaf6",
    fg: "#2b2b2b",
    accent: "#c5a572",
    font: "'Playfair Display', serif",
    sample: "Aa",
  },
  editorial: {
    bg: "#f5f1ea",
    fg: "#1a1a1a",
    accent: "#8b6f47",
    font: "'Cormorant Garamond', serif",
    sample: "Aa",
  },
  minimal: {
    bg: "#ffffff",
    fg: "#111111",
    accent: "#666666",
    font: "'Inter', sans-serif",
    sample: "Aa",
  },
  "modern-noir": {
    bg: "#0e0e0e",
    fg: "#f5f5f5",
    accent: "#d4af37",
    font: "'Bodoni Moda', serif",
    sample: "Aa",
  },
  "art-deco": {
    bg: "#1a1a2e",
    fg: "#f0d878",
    accent: "#c9a227",
    font: "'Cinzel', serif",
    sample: "Aa",
  },
  "sky-peach": {
    bg: "#fde8d7",
    fg: "#3a3a55",
    accent: "#7aa9d6",
    font: "'Quicksand', sans-serif",
    sample: "Aa",
  },
};

export default function DemoSignupDialog({ open, onOpenChange, currentThemeId }: Props) {
  const navigate = useNavigate();
  const { resolvedTheme, theme } = useTheme();
  const activeThemeClass = (resolvedTheme || theme || "light") as string;
  const activeThemeId: TenantThemeId = currentThemeId ?? DEFAULT_THEME_ID;

  const [hosts, setHosts] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [themeId, setThemeId] = useState<TenantThemeId>(DEFAULT_THEME_ID);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setHosts("");
    setEventDate("");
    setEmail("");
    setPassword("");
    setThemeId(DEFAULT_THEME_ID);
  };

  const splitHosts = (raw: string): { primary: string; secondary: string } => {
    const cleaned = raw.trim().replace(/\s+/g, " ");
    const parts = cleaned.split(/\s+e\s+|\s*&\s*/i);
    const primary = (parts[0] ?? "").trim();
    const secondary = (parts.slice(1).join(" e ") ?? "").trim();
    return { primary, secondary };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (hosts.trim().length < 2) {
      toast({ title: "Informe o nome dos anfitriões.", variant: "destructive" });
      return;
    }
    if (!eventDate) {
      toast({ title: "Informe a data do casamento.", variant: "destructive" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast({ title: "E-mail inválido.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "A senha deve ter pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { primary, secondary } = splitHosts(hosts);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase() ?? "";
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          toast({
            title: "E-mail já cadastrado",
            description: "Já existe uma conta cadastrada com este e-mail. Faça login para continuar.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Não foi possível criar a demonstração.",
            variant: "destructive",
          });
        }
        return;
      }

      if (!signUpData.session) {
        toast({
          title: "Verifique seu e-mail",
          description: "Verifique seu e-mail para ativar sua demonstração.",
        });
        onOpenChange(false);
        reset();
        return;
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc("create_demo_tenant", {
        _primary_name: primary || hosts.trim(),
        _secondary_name: secondary,
        _event_date: eventDate,
        _theme_id: themeId,
        _event_type: "wedding",
      });

      if (rpcError) {
        toast({
          title: "Não foi possível criar a demonstração.",
          variant: "destructive",
        });
        return;
      }

      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const tenantId = row?.tenant_id as string | undefined;
      const tenantSlug = row?.tenant_slug as string | undefined;

      if (!tenantId || !tenantSlug) {
        toast({ title: "Não foi possível criar a demonstração.", variant: "destructive" });
        return;
      }

      await logAdminAction({
        action: "DEMO_CREATED",
        tableName: "wedding_details",
        recordId: tenantId,
        newData: { slug: tenantSlug, theme_id: themeId, is_demo: true },
        affectedName: hosts.trim(),
        weddingId: tenantId,
      });

      toast({ title: "Sua demonstração foi criada com sucesso." });

      const adminUrl =
        buildTenantAdminUrl({ slug: tenantSlug, event_type: "wedding" }) ??
        `/casamento/${tenantSlug}/admin`;
      onOpenChange(false);
      reset();
      navigate(adminUrl);
    } catch {
      toast({ title: "Não foi possível criar a demonstração.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogPortal>
        <DialogOverlay data-theme={activeThemeId} className={activeThemeClass} />
        <DialogPrimitive.Content
          data-theme={activeThemeId}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            activeThemeClass,
            "sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
          )}
        >
          <DialogHeader>
            <DialogTitle>Criar demonstração gratuita</DialogTitle>
            <DialogDescription>
              Teste a plataforma por 7 dias com acesso completo ao painel administrativo.
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-hosts">Nome dos anfitriões</Label>
            <Input
              id="demo-hosts"
              placeholder="Ex.: Ana e João"
              value={hosts}
              onChange={(e) => setHosts(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-date">Data do casamento</Label>
            <Input
              id="demo-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-email">E-mail</Label>
            <Input
              id="demo-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-password">Senha</Label>
            <Input
              id="demo-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>

          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(themeRegistry).map((t) => {
                const preview = THEME_PREVIEWS[t.id];
                const selected = themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    aria-pressed={selected}
                    className={cn(
                      "group relative rounded-md border overflow-hidden text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary ring-2 ring-primary/60"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div
                      className="h-16 px-2 flex items-center justify-between"
                      style={{ background: preview.bg, color: preview.fg }}
                    >
                      <span
                        style={{ fontFamily: preview.font }}
                        className="text-2xl leading-none"
                      >
                        {preview.sample}
                      </span>
                      <span
                        className="h-6 w-6 rounded-full border"
                        style={{ background: preview.accent, borderColor: preview.fg + "33" }}
                        aria-hidden
                      />
                    </div>
                    <div className="px-2 py-1.5 text-xs font-medium bg-background">
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando..." : "Criar demonstração"}
            </Button>
          </DialogFooter>
        </form>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
