import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWedding } from "@/contexts/WeddingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { invitationSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { useAuth } from "@/hooks/useAuth";
import { logAdminAction } from "@/lib/adminLogger";

const InvitationsManager = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const { weddingId } = useWedding();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
  });

  useEffect(() => {
    if (weddingId) fetchInvitations();
  }, [weddingId]);

  const fetchInvitations = async () => {
    if (!weddingId) return;
    const { data } = await supabase
      .from("invitations")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false });
    setInvitations(data || []);
  };

  const generateUniqueCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = invitationSchema.safeParse(formData);
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Erro de validação",
          description: firstError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const phone = validationResult.data.guestPhone?.trim();
      const email = validationResult.data.guestEmail?.trim();
      
      let guestId: string | null = null;
      
      if (phone) {
        const { data: guestByPhone } = await supabase
          .from("guests")
          .select("id")
          .eq("phone", phone)
          .is("archived_at", null)
          .maybeSingle();
        guestId = guestByPhone?.id || null;
      }
      
      if (!guestId && email) {
        const { data: guestByEmail } = await supabase
          .from("guests")
          .select("id")
          .eq("email", email)
          .is("archived_at", null)
          .maybeSingle();
        guestId = guestByEmail?.id || null;
      }

      if (!guestId) {
        toast({
          title: "Erro",
          description: "Convidado não encontrado na lista de convidados. Cadastre-o primeiro.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const uniqueCode = generateUniqueCode();
      const { error } = await supabase.from("invitations").insert({
        wedding_id: weddingId,
        guest_id: guestId,
        guest_name: validationResult.data.guestName.trim(),
        guest_email: email || null,
        guest_phone: phone || null,
        unique_code: uniqueCode,
      });

      if (error) throw error;

      toast({
        title: "Convite criado!",
        description: "O link foi gerado com sucesso.",
      });

      setFormData({ guestName: "", guestEmail: "", guestPhone: "" });
      fetchInvitations();
    } catch (error) {
      toast({
        title: "Erro",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = (code: string) => {
    const link = `${window.location.origin}/convite/${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link do convite foi copiado para a área de transferência.",
    });
  };

  const deleteInvitation = async (invitation: any) => {
    try {
      // 1. Unclaim gift linked to this guest
      await supabase.rpc("unclaim_gift", { p_guest_id: invitation.guest_id });

      // 2. Delete RSVP tokens for this guest
      await supabase
        .from("rsvp_tokens")
        .delete()
        .eq("guest_id", invitation.guest_id);

      // 3. Hard delete the invitation
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitation.id);

      if (error) throw error;

      // 4. Log the action
      await logAdminAction({
        action: "delete",
        tableName: "invitations",
        recordId: invitation.id,
        oldData: {
          guest_name: invitation.guest_name,
          guest_phone: invitation.guest_phone,
          guest_email: invitation.guest_email,
          unique_code: invitation.unique_code,
          attending: invitation.attending,
          message: invitation.message,
        },
        affectedName: invitation.guest_name,
      });

      toast({
        title: "Convite excluído",
        description: "O convite foi removido permanentemente do sistema.",
      });

      fetchInvitations();
    } catch (error) {
      toast({
        title: "Erro",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl font-serif">Convites</CardTitle>
              <CardDescription>Gerencie os convites personalizados</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Convite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Convite</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do convidado para gerar um link personalizado
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guestName">Nome do Convidado</Label>
                    <Input
                      id="guestName"
                      value={formData.guestName}
                      onChange={(e) =>
                        setFormData({ ...formData, guestName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestEmail">E-mail</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      value={formData.guestEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, guestEmail: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone">Telefone</Label>
                    <Input
                      id="guestPhone"
                      value={formData.guestPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, guestPhone: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando..." : "Criar Convite"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.guest_name}</TableCell>
                  <TableCell>{invitation.guest_email || "-"}</TableCell>
                  <TableCell>{invitation.guest_phone || "-"}</TableCell>
                  <TableCell>
                    {invitation.responded_at ? (
                      <span className="text-green-600">Respondido</span>
                    ) : (
                      <span className="text-muted-foreground">Pendente</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {invitation.attending === null ? (
                      "-"
                    ) : invitation.attending ? (
                      <span className="text-green-600">Sim {invitation.plus_one ? "(+1)" : ""}</span>
                    ) : (
                      <span className="text-red-600">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyInvitationLink(invitation.unique_code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteInvitation(invitation)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationsManager;
