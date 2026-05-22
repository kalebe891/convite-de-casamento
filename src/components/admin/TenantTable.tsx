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
import { ArrowRight, Trash2 } from "lucide-react";

type Wedding = {
  id: string;
  slug: string | null;
  event_type: string | null;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string;
  created_at: string;
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
            <TableHead className="text-right">Convidados</TableHead>
            <TableHead className="text-right">Convites</TableHead>
            <TableHead className="text-right">Fotos</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weddings.map((w) => {
            const url = buildUrl(w);
            const c = counts[w.id];
            const status = statusFor(w.wedding_date);
            return (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{formatNames(w)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{eventTypeLabel(w.event_type)}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{w.slug ?? "—"}</TableCell>
                <TableCell>{formatDate(w.wedding_date)}</TableCell>
                <TableCell>
                  {status ? <Badge variant={status.variant}>{status.label}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-right">{c?.guests ?? "—"}</TableCell>
                <TableCell className="text-right">{c?.invitations ?? "—"}</TableCell>
                <TableCell className="text-right">{c?.photos ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(w.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
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
