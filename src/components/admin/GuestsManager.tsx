import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageSquare, Trash2, Copy, ExternalLink, RefreshCw, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { guestSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import GuestMessagesDialog from "./GuestMessagesDialog";

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

interface GuestsManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const GuestsManager = ({ permissions }: GuestsManagerProps) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppLink, setWhatsAppLink] = useState("");
  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [editGuest, setEditGuest] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
  });

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching guests:", error);
      toast.error("Erro ao carregar convidados");
    } else {
      setGuests(data || []);
    }
  };

  useEffect(() => {
    fetchGuests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("guests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
        },
        () => {
          fetchGuests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddGuest = async () => {
    if (!permissions.canAdd) {
      toast.error("Você não possui permissão para adicionar convidados");
      return;
    }

    // Validate input data
    const validationResult = guestSchema.safeParse(newGuest);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const { error } = await supabase.from("guests").insert({
      name: validationResult.data.name.trim(),
      phone: validationResult.data.phone?.trim() || null,
      email: validationResult.data.email?.trim() || null,
      status: "pending",
    });

    if (error) {
      console.error("Error adding guest:", error);
      toast.error(getSafeErrorMessage(error));
    } else {
      toast.success("Convidado adicionado com sucesso!");
      setNewGuest({ name: "", phone: "", email: "" });
      setIsAddOpen(false);
      fetchGuests();
    }
  };

  const handleOpenEditDialog = (guest: Guest) => {
    setEditGuest({
      id: guest.id,
      name: guest.name,
      phone: guest.phone || "",
      email: guest.email || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateGuest = async () => {
    if (!permissions.canEdit) {
      toast.error("Você não possui permissão para editar convidados");
      return;
    }

    // Validate input data
    const validationResult = guestSchema.safeParse({
      name: editGuest.name,
      phone: editGuest.phone,
      email: editGuest.email,
    });
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    // Check for duplicate phone (excluding current guest)
    const phoneToCheck = validationResult.data.phone?.trim();
    if (phoneToCheck) {
      const { data: existingGuests, error: checkError } = await supabase
        .from("guests")
        .select("id, phone")
        .eq("phone", phoneToCheck)
        .neq("id", editGuest.id);

      if (checkError) {
        console.error("Error checking phone:", checkError);
        toast.error("Erro ao verificar telefone");
        return;
      }

      if (existingGuests && existingGuests.length > 0) {
        toast.error("Já existe outro convidado com este telefone");
        return;
      }
    }

    // Get old data for logging
    const oldGuest = guests.find(g => g.id === editGuest.id);

    const { error } = await supabase
      .from("guests")
      .update({
        name: validationResult.data.name.trim(),
        phone: validationResult.data.phone?.trim() || null,
        email: validationResult.data.email?.trim() || null,
      })
      .eq("id", editGuest.id);

    if (error) {
      console.error("Error updating guest:", error);
      toast.error(getSafeErrorMessage(error));
    } else {
      // Log the update
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("admin_logs").insert({
          user_id: userData.user.id,
          user_email: userData.user.email || null,
          action: "update",
          table_name: "guests",
          record_id: editGuest.id,
          old_data: oldGuest as any,
          new_data: {
            name: validationResult.data.name.trim(),
            phone: validationResult.data.phone?.trim() || null,
            email: validationResult.data.email?.trim() || null,
          } as any,
        });
      }

      toast.success("Convidado atualizado com sucesso!");
      setEditGuest({ id: "", name: "", phone: "", email: "" });
      setIsEditOpen(false);
      fetchGuests();
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!permissions.canDelete) {
      toast.error("Você não possui permissão para excluir convidados");
      return;
    }

    // Get guest email first
    const guest = guests.find(g => g.id === id);
    if (!guest) {
      toast.error("Convidado não encontrado");
      return;
    }

    // Get related invitations first
    const { data: invitations } = await supabase
      .from("invitations")
      .select("id")
      .or(`guest_email.eq.${guest.email},guest_phone.eq.${guest.phone}`);

    // Unassociate gifts from invitations
    if (invitations && invitations.length > 0) {
      const invitationIds = invitations.map(inv => inv.id);
      const { error: giftError } = await supabase
        .from("gift_items")
        .update({ selected_by_invitation_id: null })
        .in("selected_by_invitation_id", invitationIds);

      if (giftError) {
        console.error("Error unassociating gifts:", giftError);
      }
    }

    // Delete related rsvp_tokens
    const { error: tokenError } = await supabase
      .from("rsvp_tokens")
      .delete()
      .eq("guest_id", id);

    if (tokenError) {
      console.error("Error deleting tokens:", tokenError);
    }

    // Delete related invitations
    if (guest.email || guest.phone) {
      const { error: invitationError } = await supabase
        .from("invitations")
        .delete()
        .or(`guest_email.eq.${guest.email},guest_phone.eq.${guest.phone}`);

      if (invitationError) {
        console.error("Error deleting invitation:", invitationError);
      }
    }

    // Delete the guest
    const { error } = await supabase.from("guests").delete().eq("id", id);

    if (error) {
      console.error("Error deleting guest:", error);
      toast.error(getSafeErrorMessage(error));
    } else {
      // Clean orphaned invitations after deleting guest
      const { data: allInvitations } = await supabase
        .from("invitations")
        .select("id, guest_email, guest_phone");

      if (allInvitations) {
        const { data: allGuests } = await supabase
          .from("guests")
          .select("email, phone");

        if (allGuests) {
          const guestEmails = new Set(allGuests.map(g => g.email).filter(Boolean));
          const guestPhones = new Set(allGuests.map(g => g.phone).filter(Boolean));

          const orphanedIds = allInvitations
            .filter(inv => {
              const hasEmailMatch = inv.guest_email && guestEmails.has(inv.guest_email);
              const hasPhoneMatch = inv.guest_phone && guestPhones.has(inv.guest_phone);
              return !hasEmailMatch && !hasPhoneMatch;
            })
            .map(inv => inv.id);

          if (orphanedIds.length > 0) {
            // Unassociate gifts from orphaned invitations
            await supabase
              .from("gift_items")
              .update({ selected_by_invitation_id: null })
              .in("selected_by_invitation_id", orphanedIds);

            // Delete orphaned invitations
            await supabase
              .from("invitations")
              .delete()
              .in("id", orphanedIds);
          }
        }
      }

      toast.success("Convidado excluído com sucesso!");
      fetchGuests();
    }
  };

  const handleSendEmail = async (guest: Guest) => {
    if (!guest.email) {
      toast.error("Convidado não possui e-mail cadastrado");
      return;
    }

    const loadingToast = toast.loading("Enviando e-mail...");

    try {
      const { data, error } = await supabase.functions.invoke("send-rsvp-email", {
        body: { guest_id: guest.id },
      });

      if (error) throw error;

      toast.success("E-mail enviado com sucesso!", { id: loadingToast });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Erro ao enviar e-mail", { id: loadingToast });
    }
  };

  const handleGenerateWhatsAppLink = async (guest: Guest) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-rsvp-token", {
        body: { guest_id: guest.id },
      });

      if (error) throw error;

      // Fetch invitation message from wedding_details
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("invitation_message")
        .single();

      const invitationMessage = (weddingData as any)?.invitation_message;

      const link = data.link;
      let message = `Olá, ${guest.name}! 🎉\n\nEstamos te convidando para o nosso casamento!\nAcesse o link abaixo e confirme sua presença:\n\n${link}`;
      
      if (invitationMessage) {
        message += `\n\n${invitationMessage}`;
      }

      setWhatsAppMessage(message);
      setWhatsAppLink(link);
      setSelectedGuest(guest);
      setIsWhatsAppOpen(true);
    } catch (error: any) {
      console.error("Error generating link:", error);
      toast.error(error.message || "Erro ao gerar link");
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsAppMessage);
    toast.success("Mensagem copiada!");
  };

  const handleOpenWhatsApp = () => {
    if (selectedGuest?.phone) {
      const phone = selectedGuest.phone.replace(/\D/g, "");
      const encodedMessage = encodeURIComponent(whatsAppMessage);
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
    } else {
      toast.error("Convidado não possui telefone cadastrado");
    }
  };

  const handleRegenerateToken = async (guest: Guest) => {
    if (!permissions.canAdd) {
      toast.error("Você não possui permissão para regenerar convites");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-rsvp-token", {
        body: { guest_id: guest.id },
      });

      if (error) throw error;

      const link = data.link;
      
      // Fetch invitation message from wedding_details
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("invitation_message")
        .single();

      const invitationMessage = (weddingData as any)?.invitation_message;
      
      // Get invitation and selected gift for this guest
      const { data: invitation } = await supabase
        .from("invitations")
        .select("id")
        .or(`guest_email.eq.${guest.email},guest_phone.eq.${guest.phone}`)
        .single();

      let giftInfo = "";
      if (invitation) {
        const { data: selectedGift } = await supabase
          .from("gift_items")
          .select("gift_name")
          .eq("selected_by_invitation_id", invitation.id)
          .single();

        if (selectedGift) {
          giftInfo = `\n\n🎁 Presente selecionado anteriormente: ${selectedGift.gift_name}\nVocê pode alterar sua escolha através do link.`;
        }
      }

      let message = `Olá, ${guest.name}! 🎉\n\nSe desejar alterar sua confirmação de presença para o nosso casamento, acesse o link abaixo:\n\n${link}${giftInfo}\n\nO link é válido por 30 dias.`;
      
      if (invitationMessage) {
        message += `\n\n${invitationMessage}`;
      }

      setWhatsAppMessage(message);
      setWhatsAppLink(link);
      setSelectedGuest(guest);
      setIsWhatsAppOpen(true);

      toast.success("Novo token gerado com sucesso!");
    } catch (error: any) {
      console.error("Error regenerating token:", error);
      toast.error(error.message || "Erro ao gerar novo token");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmado</Badge>;
      case "declined":
        return <Badge variant="destructive">Recusou</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const stats = {
    total: guests.length,
    confirmed: guests.filter((g) => g.status === "confirmed").length,
    declined: guests.filter((g) => g.status === "declined").length,
    pending: guests.filter((g) => g.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recusaram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Convidados</CardTitle>
            <div className="flex gap-2">
              <GuestMessagesDialog />
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button disabled={!permissions.canAdd}>Adicionar Convidado</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Convidado</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={newGuest.name}
                      onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={newGuest.phone}
                      onChange={(e) => {
                        // Format phone as user types: (xx) xxxxx-xxxx
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 11) value = value.slice(0, 11);
                        
                        let formatted = "";
                        if (value.length > 0) {
                          formatted = `(${value.slice(0, 2)}`;
                          if (value.length > 2) {
                            formatted += `) ${value.slice(2, 7)}`;
                            if (value.length > 7) {
                              formatted += `-${value.slice(7, 11)}`;
                            }
                          }
                        }
                        setNewGuest({ ...newGuest, phone: formatted });
                      }}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newGuest.email}
                      onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <Button onClick={handleAddGuest} className="w-full" disabled={!permissions.canAdd}>
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">{guest.name}</TableCell>
                  <TableCell>{guest.phone || "-"}</TableCell>
                  <TableCell>{guest.email || "-"}</TableCell>
                  <TableCell>{getStatusBadge(guest.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(guest)}
                        title="Editar convidado"
                        disabled={!permissions.canEdit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {guest.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(guest)}
                          title="Enviar e-mail"
                          disabled={!permissions.canAdd}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateWhatsAppLink(guest)}
                        title="Gerar link para WhatsApp"
                        disabled={!permissions.canAdd}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateToken(guest)}
                        className="text-primary hover:text-primary"
                        title="Gerar novo token para alterar status"
                        disabled={!permissions.canAdd}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteGuest(guest.id)}
                        title="Excluir convidado"
                        disabled={!permissions.canDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Convidado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editGuest.name}
                onChange={(e) => setEditGuest({ ...editGuest, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone *</Label>
              <Input
                id="edit-phone"
                value={editGuest.phone}
                onChange={(e) => {
                  // Format phone as user types: (xx) xxxxx-xxxx
                  let value = e.target.value.replace(/\D/g, "");
                  if (value.length > 11) value = value.slice(0, 11);
                  
                  let formatted = "";
                  if (value.length > 0) {
                    formatted = `(${value.slice(0, 2)}`;
                    if (value.length > 2) {
                      formatted += `) ${value.slice(2, 7)}`;
                      if (value.length > 7) {
                        formatted += `-${value.slice(7, 11)}`;
                      }
                    }
                  }
                  setEditGuest({ ...editGuest, phone: formatted });
                }}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editGuest.email}
                onChange={(e) => setEditGuest({ ...editGuest, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <Button onClick={handleUpdateGuest} className="w-full" disabled={!permissions.canEdit}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isWhatsAppOpen} onOpenChange={setIsWhatsAppOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Convite via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopyMessage} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Mensagem
              </Button>
              {selectedGuest?.phone && (
                <Button onClick={handleOpenWhatsApp} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestsManager;
