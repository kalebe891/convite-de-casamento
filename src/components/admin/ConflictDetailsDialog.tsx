import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface ConflictMetadata {
  conflict?: boolean;
  reason?: string;
  kept?: string;
  replaced?: string;
  existing_timestamp?: string;
  incoming_timestamp?: string;
}

interface ConflictLog {
  id: string;
  guest_email: string;
  checked_in_at: string;
  source: string;
  metadata: ConflictMetadata;
  created_at: string;
}

interface ConflictDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ConflictLog | null;
}

export function ConflictDetailsDialog({
  open,
  onOpenChange,
  log,
}: ConflictDetailsDialogProps) {
  if (!log) return null;

  const metadata = log.metadata as ConflictMetadata;
  
  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case "duplicate":
        return "Check-in duplicado (mantido o mais antigo)";
      case "older_offline":
        return "Offline mais antigo que online (substituído)";
      case "same_timestamp":
        return "Mesmo timestamp (priorizado online)";
      default:
        return "Conflito desconhecido";
    }
  };

  const getActionBadge = () => {
    if (metadata.kept) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Mantido: {metadata.kept}
        </Badge>
      );
    }
    if (metadata.replaced) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Substituído: {metadata.replaced}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Detalhes do Conflito
          </DialogTitle>
          <DialogDescription>
            Informações sobre o conflito detectado durante a sincronização
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Convidado</p>
            <p className="text-sm text-muted-foreground">{log.guest_email}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Regra Aplicada</p>
            <p className="text-sm text-muted-foreground">
              {getReasonLabel(metadata.reason)}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Ação Tomada</p>
            {getActionBadge()}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Timestamp Existente
              </p>
              <p className="text-xs text-muted-foreground">
                {metadata.existing_timestamp
                  ? format(new Date(metadata.existing_timestamp), "dd/MM/yyyy HH:mm:ss")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Timestamp Recebido
              </p>
              <p className="text-xs text-muted-foreground">
                {metadata.incoming_timestamp
                  ? format(new Date(metadata.incoming_timestamp), "dd/MM/yyyy HH:mm:ss")
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1">Origem</p>
              <Badge variant={log.source === "online" ? "default" : "secondary"}>
                {log.source}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Detectado em</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
