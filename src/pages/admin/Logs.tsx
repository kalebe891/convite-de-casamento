import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface AdminLog {
  id: string;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

const Logs = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "insert":
        return <Plus className="w-4 h-4" />;
      case "update":
        return <Pencil className="w-4 h-4" />;
      case "delete":
        return <Trash2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      insert: "default",
      update: "secondary",
      delete: "destructive",
    };
    
    const labels: Record<string, string> = {
      insert: "Criação",
      update: "Edição",
      delete: "Exclusão",
    };

    return (
      <Badge variant={variants[action] || "default"} className="gap-1">
        {getActionIcon(action)}
        {labels[action] || action}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      gift_items: "Presentes",
      timeline_events: "Cronograma",
      buffet_items: "Buffet",
      playlist_songs: "Playlist",
      invitations: "Convites",
      guests: "Convidados",
      wedding_details: "Detalhes do Casamento",
      events: "Eventos",
      photos: "Fotos",
    };
    return labels[tableName] || tableName;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Histórico completo de ações administrativas
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>Registro de Atividades</CardTitle>
              <CardDescription>
                Todas as ações de criação, edição e exclusão
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Carregando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>ID do Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{log.user_email || "Sistema"}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>{getTableLabel(log.table_name)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.record_id ? log.record_id.substring(0, 8) + "..." : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
