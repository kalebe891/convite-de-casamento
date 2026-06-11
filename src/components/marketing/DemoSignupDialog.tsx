import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { themeRegistry, DEFAULT_THEME_ID } from "@/themes/registry";
import { logAdminAction } from "@/lib/adminLogger";
import { buildTenantAdminUrl } from "@/lib/eventType";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS = Object.values(themeRegistry).map((t) => ({
  id: t.id,
  label: t.label,
}));

export default function DemoSignupDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setHosts("");
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

      // No active session → email confirmation required
      if (!signUpData.session) {
        toast({
          title: "Verifique seu e-mail",
          description: "Verifique seu e-mail para ativar sua demonstração.",
        });
        onOpenChange(false);
        reset();
        return;
      }

      // Authenticated → invoke RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc("create_demo_tenant", {
        _primary_name: primary || hosts.trim(),
        _secondary_name: secondary,
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
      <DialogContent className="sm:max-w-md">
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
            <Label htmlFor="demo-theme">Tema</Label>
            <Select value={themeId} onValueChange={setThemeId}>
              <SelectTrigger id="demo-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {THEME_OPTIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de evento</Label>
            <Select value="wedding" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="wedding">Casamento</SelectItem>
              </SelectContent>
            </Select>
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
      </DialogContent>
    </Dialog>
  );
}
