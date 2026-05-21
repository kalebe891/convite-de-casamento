import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Copy, Mail, MessageCircle, RefreshCw, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWedding } from "@/contexts/WeddingContext";

interface PendingInvite {
  id: string;
  email: string;
  nome: string | null;
  papel: string;
  token: string;
  expires_at: string;
  usado: boolean;
  created_at: string;
}

interface PendingInvitesListProps {
  refreshTrigger?: number;
}

const PendingInvitesList = ({ refreshTrigger }: PendingInvitesListProps) => {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { mode, weddingId } = useWedding();

  const fetchInvites = async () => {
    try {
      let query = supabase
        .from("pending_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (mode === "tenant-admin") {
        if (!weddingId) {
          setInvites([]);
          return;
        }
        query = query.eq("wedding_id", weddingId);
      }

      const { data: pendingData, error: pendingError } = await query;
      if (pendingError) throw pendingError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("email");

      if (profilesError) throw profilesError;

      const existingEmails = new Set(
        profilesData?.map(p => p.email?.toLowerCase()).filter(Boolean) || []
      );

      const filteredInvites = (pendingData || []).filter(
        invite => !existingEmails.has(invite.email.toLowerCase())
      );

      setInvites(filteredInvites);
    } catch (error: any) {
      console.error("Error fetching pending invites:", error);
      toast({
        title: "Erro ao carregar convites",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, weddingId, mode]);

  const getInviteLink = (token: string) => {
    return `${window.location.origin}/criar-senha?t=${token}`;
  };

  const getWhatsAppMessage = (nome: string | null, token: string) => {
    const name = nome || "Convidado";
    const link = getInviteLink(token);
    return `Olá ${name}! 🎉\n\nEstamos te convidando para acessar o sistema de gerenciamento do nosso casamento! ❤️\n\nClique no link abaixo para criar sua senha e começar:\n${link}\n\nSe tiver qualquer dúvida, estamos à disposição!`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} copiado!`,
      description: "O conteúdo foi copiado para a área de transferência.",
    });
  };

  const openWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const resendInvite = async (invite: PendingInvite) => {
    setResendingId(invite.id);
    try {
      const { error } = await supabase.functions.invoke("invite-admin", {
        body: {
          email: invite.email,
          nome: invite.nome,
          role: invite.papel,
        },
      });

      if (error) throw error;

      toast({
        title: "Convite reenviado!",
        description: `O email foi enviado novamente para ${invite.email}`,
      });

      fetchInvites();
    } catch (error: any) {
      console.error("Error resending invite:", error);
      toast({
        title: "Erro ao reenviar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const deleteInvite = async (email: string, id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("pending_users")
        .delete()
        .eq("email", email);

      if (error) throw error;

      toast({
        title: "Convite excluído",
        description: `O convite para ${email} foi removido.`,
      });

      fetchInvites();
    } catch (error: any) {
      console.error("Error deleting invite:", error);
      toast({
        title: "Erro ao excluir convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (invite: PendingInvite) => {
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);

    if (invite.usado) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Utilizado
        </Badge>
      );
    }

    if (expiresAt < now) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Expirado
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrador",
      couple: "Casal",
      planner: "Cerimonialista",
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando convites...</p>
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhum convite pendente no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites Pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome/Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => {
              const link = getInviteLink(invite.token);
              const whatsappMsg = getWhatsAppMessage(invite.nome, invite.token);
              const isExpired = new Date(invite.expires_at) < new Date();
              const isUsed = invite.usado;

              return (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{invite.nome || "Sem nome"}</span>
                      <span className="text-sm text-muted-foreground">{invite.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleName(invite.papel)}</TableCell>
                  <TableCell>{getStatusBadge(invite)}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(new Date(invite.expires_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link, "Link")}
                        disabled={isUsed}
                        title="Copiar link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(whatsappMsg, "Mensagem")}
                        disabled={isUsed}
                        title="Copiar mensagem para WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openWhatsApp(whatsappMsg)}
                        disabled={isUsed}
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 fill-current" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resendInvite(invite)}
                        disabled={isUsed || resendingId === invite.id}
                        title="Reenviar por email"
                      >
                        {resendingId === invite.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteInvite(invite.email, invite.id)}
                        disabled={deletingId === invite.id}
                        title="Excluir convite"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === invite.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PendingInvitesList;
