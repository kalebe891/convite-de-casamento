import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useWedding } from "@/contexts/WeddingContext";

interface AdminLog {
  id: string;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  affected_name: string | null;
}

const LOGS_PER_PAGE = 100;

/** Extract affected item name from old_data/new_data for legacy logs without affected_name */
const extractAffectedName = (log: AdminLog): string => {
  if (log.affected_name) return log.affected_name;

  const data = log.new_data || log.old_data;
  if (!data) return "-";

  // Map of table_name → possible name fields (priority order)
  const nameFields: Record<string, string[]> = {
    gift_items: ["gift_name"],
    timeline_events: ["activity"],
    buffet_items: ["item_name"],
    playlist_songs: ["song_name"],
    invitations: ["guest_name"],
    guests: ["name"],
    events: ["event_name"],
    photos: ["caption", "photo_url"],
    wedding_details: [],
    profiles: ["full_name", "email"],
  };

  const fields = nameFields[log.table_name] || ["name", "title", "label"];
  for (const field of fields) {
    if (data[field]) return String(data[field]);
  }

  // For wedding_details, show which setting changed
  if (log.table_name === "wedding_details") {
    const settingLabels: Record<string, string> = {
      show_buffet_section: "Seção Buffet",
      show_playlist_section: "Seção Playlist",
      show_timeline_section: "Seção Cronograma",
      show_gifts_section: "Seção Presentes",
      show_guest_list_public: "Lista de Convidados",
      show_rsvp_status_public: "Status RSVP",
      hide_reserved_gifts: "Ocultar Reservados",
    };
    const keys = Object.keys(data);
    for (const key of keys) {
      if (settingLabels[key]) return settingLabels[key];
    }
    return "Configurações";
  }

  return "-";
};

const Logs = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { session } = useAuth();

  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE);

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from("admin_logs")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * LOGS_PER_PAGE;
      const to = from + LOGS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "insert": return <Plus className="w-4 h-4" />;
      case "update": return <Pencil className="w-4 h-4" />;
      case "delete": return <Trash2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      insert: "default",
      update: "secondary",
      delete: "destructive",
      checkin: "default",
      undo_checkin: "destructive",
      gift_received: "default",
      gift_cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      insert: "Criação",
      update: "Edição",
      delete: "Exclusão",
      checkin: "Check-in",
      undo_checkin: "Check-in cancelado",
      gift_received: "Presente recebido",
      gift_cancelled: "Presente cancelado",
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
                    <TableHead>Item Afetado</TableHead>
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
                      <TableCell className="max-w-[200px] truncate" title={extractAffectedName(log)}>
                        {extractAffectedName(log)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * LOGS_PER_PAGE) + 1} a {Math.min(currentPage * LOGS_PER_PAGE, totalCount)} de {totalCount} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
