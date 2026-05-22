import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

type Tenant = {
  id: string;
  slug: string | null;
  event_type: string | null;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string;
  created_at: string;
};

type Impact = Record<string, number | string>;

interface Props {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

const IMPACT_LABELS: Record<string, string> = {
  user_weddings: "Usuários vinculados",
  guests: "Convidados",
  invitations: "Convites",
  rsvps: "RSVPs",
  rsvp_tokens: "Tokens RSVP",
  gift_items: "Presentes",
  photos: "Fotos",
  events: "Eventos/locais",
  timeline_events: "Cronograma",
  buffet_items: "Buffet",
  playlist_songs: "Playlist",
  admin_logs: "Logs admin",
  checkin_logs: "Check-ins",
  pending_users: "Convites pendentes",
  storage_paths_detected: "Arquivos detectados",
  photos_pages_processed: "Páginas de fotos processadas",
};

export default function DeleteTenantDialog({ tenant, open, onOpenChange }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setImpact(null);
      setLoading(false);
    }
  }, [open]);

  if (!tenant) return null;

  const handleValidate = async () => {
    if (!pin.trim()) {
      toast({
        title: "PIN obrigatório",
        description: "Digite o PIN de Segurança Master.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setImpact(null);
    try {
      const { data, error } = await supabase.functions.invoke("delete-tenant", {
        body: {
          wedding_id: tenant.id,
          password_confirm: pin,
          dry_run: true,
        },
      });

      // Extract structured error from edge function FunctionsHttpError
      let errMsg: string | null = null;
      let errCode: string | null = null;
      if (error) {
        try {
          const ctx = (error as { context?: { json?: () => Promise<any> } })
            ?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            errMsg = body?.error ?? null;
            errCode = body?.code ?? null;
          }
        } catch {
          /* ignore */
        }
        if (!errMsg) errMsg = error.message ?? "Erro desconhecido";
      } else if (data?.success === false) {
        errMsg = data.error ?? "Erro desconhecido";
        errCode = data.code ?? null;
      }

      if (errMsg) {
        setPin("");
        let friendly = "Não foi possível validar a exclusão.";
        if (errCode === "INVALID_PIN")
          friendly = "PIN de segurança incorreto. A validação não foi concluída.";
        else if (errCode === "FORBIDDEN")
          friendly = "Você não tem permissão para excluir eventos.";
        else if (errCode === "TENANT_NOT_FOUND")
          friendly = "Evento não encontrado.";
        else if (errCode === "UNAUTHENTICATED")
          friendly = "Sessão expirada. Faça login novamente.";
        else if (errCode === "BAD_REQUEST" || errCode === "BAD_JSON")
          friendly = "Dados inválidos enviados para validação.";
        toast({
          title: "Validação falhou",
          description: friendly,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // success
      setImpact(data?.impact ?? {});
      setPin("");
      toast({
        title: "Validação concluída",
        description: "Auditoria de impacto recebida com sucesso.",
      });
    } catch (_e) {
      setPin("");
      toast({
        title: "Erro",
        description: "Não foi possível validar a exclusão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    [tenant.bride_name, tenant.groom_name].filter(Boolean).join(" & ") ||
    tenant.slug ||
    "Sem nome";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir evento
          </DialogTitle>
          <DialogDescription>
            Esta ação é permanente e pode remover todos os dados vinculados a este evento.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription className="text-xs">
            A exclusão real será ativada na próxima etapa. Nesta etapa, a ação apenas valida
            permissões e audita o impacto.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm border rounded-md p-3 bg-muted/30">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Evento</span>
            <span className="font-medium text-right">{displayName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Slug</span>
            <span className="font-mono text-xs text-right">{tenant.slug ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Tipo</span>
            <Badge variant="secondary">{tenant.event_type ?? "—"}</Badge>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Nome principal</span>
            <span className="text-right">{tenant.bride_name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Nome secundário</span>
            <span className="text-right">{tenant.groom_name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Data do evento</span>
            <span className="text-right">{formatDate(tenant.wedding_date)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Criado em</span>
            <span className="text-right">{formatDate(tenant.created_at)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-[10px] text-right break-all">{tenant.id}</span>
          </div>
        </div>

        {impact && (
          <div className="space-y-1 text-sm border rounded-md p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Impacto auditado (dry-run)
            </p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(impact).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs gap-2">
                  <span className="text-muted-foreground">{IMPACT_LABELS[k] ?? k}</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="master-pin">
            Digite o PIN de Segurança Master para confirmar
          </Label>
          <Input
            id="master-pin"
            type="password"
            placeholder="PIN de segurança"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="off"
            disabled={loading}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleValidate}
            disabled={loading || !pin.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              "Validar exclusão"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
