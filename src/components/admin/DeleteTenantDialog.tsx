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
  onDeleted?: () => void;
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

function mapErrorMessage(code: string | null): string {
  switch (code) {
    case "INVALID_PIN":
      return "PIN de segurança incorreto. A exclusão não foi realizada.";
    case "FORBIDDEN":
      return "Você não tem permissão para excluir eventos.";
    case "TENANT_NOT_FOUND":
      return "Evento não encontrado.";
    case "REFERENTIAL_INTEGRITY_ERROR":
      return "Erro de integridade referencial. Verifique as constraints de Cascade no banco de dados.";
    case "STORAGE_DELETE_FAILED":
      return "Falha ao remover arquivos do Storage. O evento não foi excluído.";
    case "STORAGE_COLLECT_FAILED":
      return "Falha ao coletar arquivos do Storage.";
    case "UNAUTHENTICATED":
      return "Sessão expirada. Faça login novamente.";
    case "BAD_REQUEST":
    case "BAD_JSON":
      return "Dados inválidos enviados para exclusão.";
    default:
      return "Não foi possível excluir o evento.";
  }
}

async function extractError(error: unknown, data: any): Promise<{ msg: string | null; code: string | null }> {
  let msg: string | null = null;
  let code: string | null = null;
  if (error) {
    try {
      const ctx = (error as { context?: { json?: () => Promise<any> } })?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        msg = body?.error ?? null;
        code = body?.code ?? null;
      }
    } catch {
      /* ignore */
    }
    if (!msg) msg = (error as { message?: string }).message ?? "Erro desconhecido";
  } else if (data?.success === false) {
    msg = data.error ?? "Erro desconhecido";
    code = data.code ?? null;
  }
  return { msg, code };
}

export default function DeleteTenantDialog({ tenant, open, onOpenChange, onDeleted }: Props) {
  const [pin, setPin] = useState("");
  const [validating, setValidating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setImpact(null);
      setValidating(false);
      setDeleting(false);
    }
  }, [open]);

  if (!tenant) return null;

  const handleValidate = async () => {
    if (!pin.trim()) {
      toast({ title: "PIN obrigatório", description: "Digite o PIN de Segurança Master.", variant: "destructive" });
      return;
    }
    setValidating(true);
    setImpact(null);
    try {
      const { data, error } = await supabase.functions.invoke("delete-tenant", {
        body: { wedding_id: tenant.id, password_confirm: pin, dry_run: true },
      });
      const { msg, code } = await extractError(error, data);
      if (msg) {
        if (code === "INVALID_PIN") setPin("");
        toast({ title: "Validação falhou", description: mapErrorMessage(code), variant: "destructive" });
        return;
      }
      setImpact(data?.impact ?? {});
      toast({ title: "Validação concluída", description: "Auditoria de impacto recebida. Revise antes de excluir." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível validar a exclusão.", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleDelete = async () => {
    if (!pin.trim()) {
      toast({ title: "PIN obrigatório", description: "Digite o PIN de Segurança Master.", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-tenant", {
        body: { wedding_id: tenant.id, password_confirm: pin, dry_run: false },
      });
      const { msg, code } = await extractError(error, data);
      if (msg) {
        if (code === "INVALID_PIN") setPin("");
        toast({ title: "Exclusão falhou", description: mapErrorMessage(code), variant: "destructive" });
        return;
      }
      toast({ title: "Evento excluído", description: "Evento excluído com sucesso." });
      onDeleted?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir o evento.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const displayName =
    [tenant.bride_name, tenant.groom_name].filter(Boolean).join(" & ") ||
    tenant.slug ||
    "Sem nome";

  const busy = validating || deleting;
  const hasLargeImpact =
    impact &&
    Object.entries(impact).some(([k, v]) => {
      if (k === "photos_pages_processed") return false;
      return typeof v === "number" && v > 0;
    });

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir evento
          </DialogTitle>
          <DialogDescription>
            Esta ação é permanente. Primeiro valide o impacto e depois confirme a exclusão definitiva.
          </DialogDescription>
        </DialogHeader>

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
            <span className="text-muted-foreground">Data do evento</span>
            <span className="text-right">{formatDate(tenant.wedding_date)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-[10px] text-right break-all">{tenant.id}</span>
          </div>
        </div>

        {impact && (
          <>
            <div className="space-y-1 text-sm border rounded-md p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Impacto auditado
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
            {hasLargeImpact && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  Este evento possui dados vinculados (convidados, fotos, convites, etc.).
                  A exclusão é irreversível e removerá também os arquivos do Storage.
                </AlertDescription>
              </Alert>
            )}
            {tenant.slug && (
              <Alert>
                <AlertDescription className="text-xs">
                  Este evento possui slug público <span className="font-mono">/{tenant.slug}</span>.
                  Tem certeza que deseja removê-lo?
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="master-pin">PIN de Segurança Master</Label>
          <Input
            id="master-pin"
            type="password"
            placeholder="PIN de segurança"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={handleValidate}
            disabled={busy || !pin.trim()}
          >
            {validating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              "Validar exclusão"
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={busy || !pin.trim() || !impact}
            title={!impact ? "Valide o impacto antes de excluir" : undefined}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir definitivamente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
