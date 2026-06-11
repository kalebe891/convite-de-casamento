import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Trash2, RefreshCw, Archive, RotateCcw, AlertTriangle, Wrench } from "lucide-react";
import { isValidThemeId } from "@/lib/themeValidation";

type Wedding = {
  id: string;
  slug: string | null;
  event_type: string | null;
  theme_id: string | null;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string;
  created_at: string;
  tenant_status?: string | null;
  expires_at?: string | null;
  archived_at?: string | null;
};

type Counts = {
  guests: number;
  gifts: number;
  photos: number;
  invitations: number;
};

interface Props {
  weddings: Wedding[];
  counts: Record<string, Counts>;
  formatNames: (w: Wedding) => string;
  formatDate: (d: string | null | undefined) => string;
  eventTypeLabel: (t: string | null) => string;
  statusFor: (date: string | null | undefined) => {
    label: string;
    variant: "secondary" | "default" | "outline";
  } | null;
  buildUrl: (w: Wedding) => string | null;
  onAccess: (url: string) => void;
  onDelete: (w: Wedding) => void;
  onRenew: (w: Wedding) => void;
  onArchive: (w: Wedding) => void;
  onRestore: (w: Wedding) => void;
}

function daysRemaining(expires: string | null | undefined): number | null {
  if (!expires) return null;
  const t = new Date(expires).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function TenantTable({
  weddings,
  counts,
  formatNames,
  formatDate,
  eventTypeLabel,
  statusFor,
  buildUrl,
  onAccess,
  onDelete,
  onRenew,
  onArchive,
  onRestore,
}: Props) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ciclo</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead className="text-right">Dias</TableHead>
            <TableHead className="text-right">Convidados</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weddings.map((w) => {
            const url = buildUrl(w);
            const c = counts[w.id];
            const status = statusFor(w.wedding_date);
            const isArchived = w.tenant_status === "archived";
            const days = daysRemaining(w.expires_at);
            return (
              <TableRow key={w.id} className={isArchived ? "opacity-70" : ""}>
                <TableCell className="font-medium">{formatNames(w)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{eventTypeLabel(w.event_type)}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{w.slug ?? "—"}</TableCell>
                <TableCell>{formatDate(w.wedding_date)}</TableCell>
                <TableCell>
                  {status ? <Badge variant={status.variant}>{status.label}</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={isArchived ? "outline" : "default"}>
                    {isArchived ? "Arquivado" : "Ativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{formatDate(w.expires_at)}</TableCell>
                <TableCell className="text-right text-xs">
                  {days === null ? "—" : days < 0 ? `${days}` : days}
                </TableCell>
                <TableCell className="text-right">{c?.guests ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!url}
                      onClick={() => url && onAccess(url)}
                      className="gap-1"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Painel
                    </Button>
                    {!isArchived && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRenew(w)}
                          className="gap-1"
                          title="Renovar +365 dias"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onArchive(w)}
                          className="gap-1"
                          title="Arquivar tenant"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Arquivar
                        </Button>
                      </>
                    )}
                    {isArchived && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestore(w)}
                        className="gap-1"
                        title="Restaurar tenant"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(w)}
                      className="gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
