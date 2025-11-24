import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageSquare, Trash2, Copy, ExternalLink, RefreshCw } from "lucide-react";
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

const GuestsManager = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppLink, setWhatsAppLink] = useState("");
  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("created_at", { ascending: false });

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

  const handleDeleteGuest = async (id: string) => {
    // Get guest email first
    const guest = guests.find(g => g.id === id);
    if (!guest) {
      toast.error("Convidado não encontrado");
      return;
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
    if (guest.email) {
      const { error: invitationError } = await supabase
        .from("invitations")
        .delete()
        .eq("guest_email", guest.email);

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

      const link = data.link;
      const message = `Olá, ${guest.name}! 🎉\n\nEstamos te convidando para o nosso casamento!\nAcesse o link abaixo e confirme sua presença:\n\n${link}`;

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
    try {
      const { data, error } = await supabase.functions.invoke("generate-rsvp-token", {
        body: { guest_id: guest.id },
      });

      if (error) throw error;

      const link = data.link;
      const message = `Olá, ${guest.name}! 🎉\n\nSe desejar alterar sua confirmação de presença para o nosso casamento, acesse o link abaixo:\n\n${link}\n\nO link é válido por 30 dias.`;

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
                <Button>Adicionar Convidado</Button>
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
                  <Button onClick={handleAddGuest} className="w-full">
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
                      {guest.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(guest)}
                          title="Enviar e-mail"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateWhatsAppLink(guest)}
                        title="Gerar link para WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateToken(guest)}
                        className="text-primary hover:text-primary"
                        title="Gerar novo token para alterar status"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteGuest(guest.id)}
                        title="Excluir convidado"
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
