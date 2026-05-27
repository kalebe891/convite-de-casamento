import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWedding } from "@/contexts/WeddingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageSquare, Trash2, Copy, ExternalLink, RefreshCw, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { guestSchema } from "@/lib/validationSchemas";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";
import GuestMessagesDialog from "./GuestMessagesDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SortField = "name" | "phone" | "email" | "status";
type SortDirection = "asc" | "desc";

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
  archived_at: string | null;
}

interface GuestsManagerProps {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
    isAdmin?: boolean;
  };
}

const GuestsManager = ({ permissions }: GuestsManagerProps) => {
  const { weddingId, wedding } = useWedding();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestGifts, setGuestGifts] = useState<Record<string, string>>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppLink, setWhatsAppLink] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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

  // Sort guests based on current sort field and direction
  const sortedGuests = useMemo(() => {
    return [...guests].sort((a, b) => {
      let aValue: string = "";
      let bValue: string = "";

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "phone":
          aValue = (a.phone || "").toLowerCase();
          bValue = (b.phone || "").toLowerCase();
          break;
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "status":
          // Custom order: confirmed > pending > declined
          const statusOrder: Record<string, number> = { confirmed: 0, pending: 1, declined: 2 };
          const aOrder = statusOrder[a.status] ?? 3;
          const bOrder = statusOrder[b.status] ?? 3;
          return sortDirection === "asc" ? aOrder - bOrder : bOrder - aOrder;
      }

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [guests, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 inline opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-4 w-4 inline" />
      : <ArrowDown className="ml-1 h-4 w-4 inline" />;
  };

  const fetchGuests = async () => {
    if (!weddingId) return;
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("archived_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching guests:", error);
      toast.error("Erro ao carregar convidados");
    } else {
      setGuests(data || []);
    }

    // Fetch gift associations
    const { data: giftsData } = await supabase
      .from("gift_items")
      .select("gift_name, selected_by_guest_id")
      .eq("wedding_id", weddingId)
      .not("selected_by_guest_id", "is", null);

    if (giftsData) {
      const map: Record<string, string> = {};
      for (const g of giftsData) {
        if (g.selected_by_guest_id) {
          map[g.selected_by_guest_id] = map[g.selected_by_guest_id]
            ? `${map[g.selected_by_guest_id]}, ${g.gift_name}`
            : g.gift_name;
        }
      }
      setGuestGifts(map);
    }
  };

  useEffect(() => {
    if (!weddingId) return;
    fetchGuests();

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

    if (!weddingId) {
      toast.error("Não foi possível identificar o evento para vincular o convidado.");
      return;
    }

    const guestPayload = {
      name: validationResult.data.name.trim(),
      phone: validationResult.data.phone?.trim() || null,
      email: validationResult.data.email?.trim() || null,
      status: "pending",
      wedding_id: weddingId,
    };

    const { data: insertedGuest, error } = await supabase
      .from("guests")
      .insert(guestPayload)
      .select("id")
      .single();

    if (error) {
      console.error("Error adding guest:", error);
      toast.error(getSafeErrorMessage(error));
    } else {
      await logAdminAction({
        action: "insert",
        tableName: "guests",
        recordId: insertedGuest?.id,
        newData: guestPayload,
        affectedName: guestPayload.name,
        weddingId,
      });

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
        .eq("wedding_id", weddingId!)
        .is("archived_at", null)
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
      .eq("id", editGuest.id)
      .eq("wedding_id", weddingId!);

    if (error) {
      console.error("Error updating guest:", error);
      toast.error(getSafeErrorMessage(error));
    } else {
      await logAdminAction({
        action: "update",
        tableName: "guests",
        recordId: editGuest.id,
        oldData: oldGuest as any,
        newData: {
          name: validationResult.data.name.trim(),
          phone: validationResult.data.phone?.trim() || null,
          email: validationResult.data.email?.trim() || null,
        },
        affectedName: validationResult.data.name.trim(),
        weddingId,
      });

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

    const guest = guests.find(g => g.id === id);
    if (!guest) {
      toast.error("Convidado não encontrado");
      return;
    }

    try {
      // 1. Unclaim gifts linked to this guest
      await supabase.rpc("unclaim_gift", { p_guest_id: id });

      // 2. Delete RSVP tokens for this guest
      await supabase.from("rsvp_tokens").delete().eq("guest_id", id);

      // 3. Delete invitations for this guest
      await supabase.from("invitations").delete().eq("guest_id", id);

      // 4. Hard delete the guest
      const { error } = await supabase.from("guests").delete().eq("id", id).eq("wedding_id", weddingId!);

      if (error) throw error;

      // 5. Log the action
      await logAdminAction({
        action: "delete",
        tableName: "guests",
        recordId: id,
        oldData: guest,
        affectedName: guest.name,
      });

      toast.success("Convidado excluído permanentemente!");
      fetchGuests();
    } catch (error) {
      console.error("Error deleting guest:", error);
      toast.error(getSafeErrorMessage(error));
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

      const invitationMessage = wedding?.invitation_message;
      const link = data.link;
      const fallback = `{guest_name}, confirme sua presença:\n{invitation_link}`;
      const template = invitationMessage?.trim() || fallback;
      const message = template
        .replace(/\{guest_name\}/g, guest.name)
        .replace(/\{invitation_link\}/g, link);

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
      let phone = selectedGuest.phone.replace(/\D/g, "");
      if (!phone.startsWith("55")) {
        phone = "55" + phone;
      }
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
      const invitationMessage = wedding?.invitation_message;


      const fallback = `{guest_name}, confirme sua presença:\n{invitation_link}`;
      const template = invitationMessage?.trim() || fallback;
      const message = template
        .replace(/\{guest_name\}/g, guest.name)
        .replace(/\{invitation_link\}/g, link);

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
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort("name")}
                >
                  Nome {getSortIcon("name")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort("phone")}
                >
                  Telefone {getSortIcon("phone")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort("status")}
                >
                  Status {getSortIcon("status")}
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {guest.name}
                      {guestGifts[guest.id] && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="p-1 rounded-md hover:bg-muted transition-colors">
                              <Gift className="h-4 w-4 text-primary shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="top" className="w-auto max-w-[250px] p-3 text-sm">
                            🎁 {guestGifts[guest.id]}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{guest.phone || "-"}</TableCell>
                  
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
