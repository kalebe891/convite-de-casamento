import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  saveGuests,
  getGuests,
  addToOutbox,
  getPendingCheckins,
  updateGuestCheckin,
  removeFromOutbox,
} from "@/lib/db";
import { Search, Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ConflictDetailsDialog } from "@/components/admin/ConflictDetailsDialog";
import { logAdminAction } from "@/lib/adminLogger";
import { usePagePermissions } from "@/hooks/usePagePermissions";

interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  checked_in_at: string | null;
}

const Checkin = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const permissions = usePagePermissions("checkin");
  const isOnline = useOnlineStatus();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestGifts, setGuestGifts] = useState<Record<string, string>>({});
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<any | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [giftDelivered, setGiftDelivered] = useState<Record<string, boolean>>({});

  // Fetch guests and sync with local DB
  const fetchGuests = async () => {
    try {
      setLoading(true);
      
      if (isOnline) {
        // Fetch from server
        const { data, error } = await supabase
          .from("guests")
          .select("id, name, email, phone, status, checked_in_at")
          .is("archived_at", null)
          .order("name");

        if (error) throw error;

        const guestData = (data || []).sort((a, b) => {
          const aConfirmed = a.status === "confirmed" ? 0 : 1;
          const bConfirmed = b.status === "confirmed" ? 0 : 1;
          if (aConfirmed !== bConfirmed) return aConfirmed - bConfirmed;
          return a.name.localeCompare(b.name);
        });
        setGuests(guestData);
        setFilteredGuests(guestData);

        // Save to IndexedDB
        await saveGuests(guestData);

        // Fetch gift associations
        const { data: giftsData } = await supabase
          .from("gift_items")
          .select("gift_name, selected_by_guest_id, is_purchased")
          .not("selected_by_guest_id", "is", null);

        if (giftsData) {
          const map: Record<string, string> = {};
          const delivered: Record<string, boolean> = {};
          for (const g of giftsData) {
            if (g.selected_by_guest_id) {
              map[g.selected_by_guest_id] = map[g.selected_by_guest_id]
                ? `${map[g.selected_by_guest_id]}, ${g.gift_name}`
                : g.gift_name;
              if (g.is_purchased) {
                delivered[g.selected_by_guest_id] = true;
              }
            }
          }
          setGuestGifts(map);
          setGiftDelivered(delivered);
        }
      } else {
        // Load from IndexedDB
        const cachedGuests = await getGuests() as Guest[];
        setGuests(cachedGuests);
        setFilteredGuests(cachedGuests);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar convidados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update pending count and fetch conflicts
  const updatePendingCount = async () => {
    const pending = await getPendingCheckins();
    setPendingCount(pending.length);
  };

  const fetchConflicts = async () => {
    try {
      const { data, error } = await supabase
        .from("checkin_logs")
        .select("*")
        .not("metadata->>conflict", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setConflicts(data || []);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
    }
  };

  // Sync pending check-ins
  const syncCheckins = async () => {
    if (!isOnline || !user) return;

    try {
      setSyncing(true);
      const pending = await getPendingCheckins();

      if (pending.length === 0) {
        toast({
          title: "Tudo sincronizado",
          description: "Não há alterações pendentes",
        });
        return;
      }

      const checks = pending.map((item) => ({
        guest_id: item.guest_id,
        guest_email: item.guest_email,
        checked_in_at: item.checked_in_at,
        source: item.source,
        metadata: {},
      }));

      const { data, error } = await supabase.functions.invoke("sync-checkin", {
        body: { checks },
      });

      if (error) throw error;

      // Remove synced items from outbox
      for (const item of pending) {
        await removeFromOutbox(item.id);
      }

      toast({
        title: "Sincronização completa",
        description: `${data.successCount} check-ins sincronizados`,
      });

      if (data.failed.length > 0) {
        console.warn("Failed check-ins:", data.failed);
      }

      await updatePendingCount();
      await fetchGuests();
      await fetchConflicts();
    } catch (error) {
      toast({
        title: "Erro na sincronização",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Handle check-in
  const handleCheckin = async (guest: Guest) => {
    if (!user) return;

    // Use email or phone as identifier
    const guestIdentifier = guest.email || guest.phone;
    if (!guestIdentifier) {
      toast({
        title: "Erro",
        description: "Convidado não possui e-mail ou telefone cadastrado",
        variant: "destructive",
      });
      return;
    }

    const checked_in_at = new Date().toISOString();

    try {
      if (isOnline) {
        // Online: call edge function directly
        const { data, error } = await supabase.functions.invoke("sync-checkin", {
          body: {
            checks: [
              {
                guest_id: guest.id,
                guest_email: guestIdentifier,
                checked_in_at,
                source: "online",
                metadata: {},
              },
            ],
          },
        });

        if (error) throw error;

        if (data.successCount > 0) {
          toast({
            title: "Check-in realizado",
            description: `${guest.name} confirmado`,
          });
          await fetchGuests();
        } else if (data.failed.length > 0) {
          throw new Error(data.failed[0].reason);
        }
      } else {
        // Offline: save to outbox
        await addToOutbox({
          guest_id: guest.id,
          guest_email: guestIdentifier,
          checked_in_at,
          performed_by: user.id,
          source: "offline",
        });

        // Update local cache
        await updateGuestCheckin(guest.id, checked_in_at);

        toast({
          title: "Check-in salvo offline",
          description: "Será sincronizado quando conectar",
        });

        await updatePendingCount();
        await fetchGuests();
      }
    } catch (error) {
      console.error("Check-in error:", error);
      toast({
        title: "Erro",
        description: "Falha ao realizar check-in",
        variant: "destructive",
      });
    }
  };

  // Handle undo check-in
  const handleUndoCheckin = async (guest: Guest) => {
    if (!user) return;

    if (!isOnline) {
      toast({
        title: "Sem conexão",
        description: "É necessário estar online para desfazer o check-in",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use edge function to undo check-in (bypasses RLS issues for custom roles)
      const guestIdentifier = guest.email || guest.phone;
      const { data, error } = await supabase.functions.invoke("sync-checkin", {
        body: {
          checks: [{
            guest_id: guest.id,
            guest_email: guestIdentifier,
            checked_in_at: null,
            source: "online",
            metadata: { action: "undo_checkin" },
          }],
        },
      });

      if (error) throw error;

      toast({
        title: "Check-in desfeito",
        description: `Check-in de ${guest.name} foi removido`,
      });

      await fetchGuests();
    } catch (error) {
      console.error("Undo check-in error:", error);
      toast({
        title: "Erro",
        description: "Falha ao desfazer check-in",
        variant: "destructive",
      });
    }
  };

  // Handle gift delivery confirmation
  const handleGiftDelivery = async (guest: Guest) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("gift_items")
        .update({ is_purchased: true })
        .eq("selected_by_guest_id", guest.id);

      if (error) throw error;

      await logAdminAction({
        action: "gift_received",
        tableName: "gift_items",
        recordId: guest.id,
        oldData: { is_purchased: false, guest_name: guest.name },
        newData: { is_purchased: true, guest_name: guest.name },
        affectedName: guest.name,
      });

      setGiftDelivered((prev) => ({ ...prev, [guest.id]: true }));

      toast({
        title: "Presente recebido",
        description: `Presente de ${guest.name} foi registrado como entregue`,
      });
    } catch (error) {
      console.error("Gift delivery error:", error);
      toast({
        title: "Erro",
        description: "Falha ao registrar entrega do presente",
        variant: "destructive",
      });
    }
  };

  // Handle cancel gift delivery
  const handleCancelGiftDelivery = async (guest: Guest) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("gift_items")
        .update({ is_purchased: false })
        .eq("selected_by_guest_id", guest.id);

      if (error) throw error;

      await logAdminAction({
        action: "gift_cancelled",
        tableName: "gift_items",
        recordId: guest.id,
        oldData: { is_purchased: true, guest_name: guest.name },
        newData: { is_purchased: false, guest_name: guest.name },
        affectedName: guest.name,
      });

      setGiftDelivered((prev) => ({ ...prev, [guest.id]: false }));

      toast({
        title: "Recebimento cancelado",
        description: `Recebimento do presente de ${guest.name} foi cancelado`,
      });
    } catch (error) {
      console.error("Cancel gift delivery error:", error);
      toast({
        title: "Erro",
        description: "Falha ao cancelar recebimento do presente",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredGuests(guests);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredGuests(
        guests.filter(
          (g) =>
            g.name.toLowerCase().includes(term) ||
            (g.email && g.email.toLowerCase().includes(term))
        )
      );
    }
  }, [searchTerm, guests]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncCheckins();
    }
  }, [isOnline]);

  // Initial load
  useEffect(() => {
    fetchGuests();
    updatePendingCount();
    fetchConflicts();
  }, []);

  const getStatusBadge = (guest: Guest) => {
    if (guest.checked_in_at) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Check-in feito
        </Badge>
      );
    }
    if (guest.status === "confirmed") {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Confirmado
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <XCircle className="w-3 h-3 mr-1" />
        Não confirmado
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Check-in</h1>
          <p className="text-muted-foreground mt-2">
            Sistema de check-in de convidados (suporta modo offline)
          </p>
        </div>
        <Button onClick={syncCheckins} disabled={!isOnline || syncing} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Status Banner */}
      <Card className={isOnline ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-medium">
                {isOnline ? "Conectado — Tudo sincronizado" : `Modo offline — ${pendingCount} alterações pendentes`}
              </span>
            </div>
            {!isOnline && pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount} pendentes</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">
                  ⚠️ {conflicts.length} conflito(s) detectado(s) e resolvido(s) automaticamente
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (conflicts[0]) {
                    setSelectedConflict(conflicts[0]);
                    setConflictDialogOpen(true);
                  }
                }}
              >
                Ver detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Convidado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Digite o nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Convidados ({filteredGuests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum convidado encontrado</p>
          ) : (
            <div className="space-y-3">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{guest.name}</p>
                    <p className="text-sm text-muted-foreground">{guest.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                     {getStatusBadge(guest)}
                     {giftDelivered[guest.id] && (
                       <Badge variant="default" className="bg-green-600">
                         <CheckCircle className="w-3 h-3 mr-1" />
                         Presente recebido
                       </Badge>
                     )}
                     <div className="flex items-center gap-1">
                       <Button
                         onClick={() => guest.checked_in_at ? handleUndoCheckin(guest) : handleCheckin(guest)}
                         variant={guest.checked_in_at ? "outline" : "default"}
                         size="sm"
                         disabled={guest.checked_in_at && giftDelivered[guest.id]}
                         title={guest.checked_in_at && giftDelivered[guest.id] ? "Cancele o recebimento do presente antes de desfazer o check-in" : undefined}
                       >
                         {guest.checked_in_at ? "Desfazer" : "Check-in"}
                       </Button>
                       {guestGifts[guest.id] && (
                         <>
                           <Button
                             variant={giftDelivered[guest.id] ? "outline" : "default"}
                             size="sm"
                             disabled={!guest.checked_in_at || giftDelivered[guest.id]}
                             onClick={() => handleGiftDelivery(guest)}
                             title={giftDelivered[guest.id] ? "Presente já recebido" : guest.checked_in_at ? `🎁 ${guestGifts[guest.id]}` : "Faça o check-in primeiro"}
                             className="gap-1"
                           >
                             <Gift className="h-4 w-4" />
                             <span className="hidden sm:inline text-xs">
                               Receber presente
                             </span>
                           </Button>
                           {giftDelivered[guest.id] && permissions.canEdit && (
                             <Button
                               variant="destructive"
                               size="sm"
                               onClick={() => handleCancelGiftDelivery(guest)}
                               title="Cancelar recebimento do presente"
                               className="gap-1"
                             >
                               <XCircle className="h-4 w-4" />
                               <span className="hidden sm:inline text-xs">Cancelar</span>
                             </Button>
                           )}
                         </>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflict Details Dialog */}
      <ConflictDetailsDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        log={selectedConflict}
      />
    </div>
  );
};

export default Checkin;
