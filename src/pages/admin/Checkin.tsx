import { useState, useEffect, useRef, useCallback } from "react";
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
import { Search, RefreshCw, CheckCircle, XCircle, Clock, Gift, Bell, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logAdminAction } from "@/lib/adminLogger";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { useNavigate } from "react-router-dom";
import { useAdminBasePath } from "@/hooks/useAdminBasePath";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StatusIndicator } from "@/components/admin/StatusIndicator";
import { useWedding } from "@/contexts/WeddingContext";

interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  checked_in_at: string | null;
}

interface ConflictLog {
  id: string;
  guest_email: string;
  guest_id: string | null;
  source: string;
  checked_in_at: string;
  created_at: string | null;
  metadata: any;
}

// Priority sorting
const sortGuestsByPriority = (
  guests: Guest[],
  giftMap: Record<string, string>,
  deliveredMap: Record<string, boolean>
): Guest[] => {
  const getPriority = (g: Guest): number => {
    const hasGift = !!giftMap[g.id];
    const giftReceived = !!deliveredMap[g.id];
    const checkedIn = !!g.checked_in_at;
    const confirmed = g.status === "confirmed";

    if (checkedIn && hasGift && !giftReceived) return 1;
    if (!checkedIn && confirmed && hasGift && !giftReceived) return 2;
    if (!checkedIn && confirmed && !hasGift) return 3;
    if (!checkedIn && !confirmed) return 4;
    if (checkedIn && hasGift && giftReceived) return 5;
    if (checkedIn && !hasGift) return 6;
    return 7;
  };

  return [...guests].sort((a, b) => {
    const pa = getPriority(a);
    const pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
};

const Checkin = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { weddingId } = useWedding();
  const permissions = usePagePermissions("checkin");
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const adminBasePath = useAdminBasePath();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestGifts, setGuestGifts] = useState<Record<string, string>>({});
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [giftDelivered, setGiftDelivered] = useState<Record<string, boolean>>({});

  // Conflict badge state
  const [recentConflicts, setRecentConflicts] = useState<ConflictLog[]>([]);
  const [unseenConflictCount, setUnseenConflictCount] = useState(0);
  const conflictBufferRef = useRef<number>(0);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buffer conflicts for grouped toast
  const notifyConflicts = useCallback((count: number) => {
    conflictBufferRef.current += count;

    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);

    conflictTimerRef.current = setTimeout(() => {
      const total = conflictBufferRef.current;
      if (total > 0) {
        toast({
          title: total === 1
            ? "1 conflito resolvido automaticamente"
            : `${total} conflitos resolvidos automaticamente`,
          duration: 3000,
        });
        conflictBufferRef.current = 0;
      }
    }, 5000);
  }, [toast]);

  // Fetch guests and sync with local DB
  const fetchGuests = async () => {
    try {
      setLoading(true);

      if (isOnline) {
        if (!weddingId) {
          setGuests([]);
          setFilteredGuests([]);
          return;
        }

        const { data, error } = await supabase
          .from("guests")
          .select("id, name, email, phone, status, checked_in_at")
          .eq("wedding_id", weddingId)
          .is("archived_at", null)
          .order("name");

        if (error) throw error;

        const rawGuests = data || [];
        await saveGuests(rawGuests);

        const { data: giftsData } = await supabase
          .from("gift_items")
          .select("gift_name, selected_by_guest_id, is_purchased")
          .eq("wedding_id", weddingId)
          .not("selected_by_guest_id", "is", null);

        const giftMap: Record<string, string> = {};
        const deliveredMap: Record<string, boolean> = {};
        if (giftsData) {
          for (const g of giftsData) {
            if (g.selected_by_guest_id) {
              giftMap[g.selected_by_guest_id] = giftMap[g.selected_by_guest_id]
                ? `${giftMap[g.selected_by_guest_id]}, ${g.gift_name}`
                : g.gift_name;
              if (g.is_purchased) {
                deliveredMap[g.selected_by_guest_id] = true;
              }
            }
          }
          setGuestGifts(giftMap);
          setGiftDelivered(deliveredMap);
        }

        const sortedGuests = sortGuestsByPriority(rawGuests, giftMap, deliveredMap);
        setGuests(sortedGuests);
        setFilteredGuests(sortedGuests);
      } else {
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

  const updatePendingCount = async () => {
    const pending = await getPendingCheckins();
    setPendingCount(pending.length);
  };

  // Fetch recent conflicts for badge/drawer
  const fetchRecentConflicts = async () => {
    try {
      if (!weddingId) return;
      const { data, error } = await supabase
        .from("checkin_logs")
        .select("*")
        .eq("wedding_id", weddingId)
        .not("metadata->>conflict", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const newConflicts = data || [];
      const prevCount = recentConflicts.length;
      setRecentConflicts(newConflicts);

      // Detect new conflicts and notify via toast
      if (newConflicts.length > prevCount && prevCount > 0) {
        const newCount = newConflicts.length - prevCount;
        setUnseenConflictCount((prev) => prev + newCount);
        notifyConflicts(newCount);
      } else if (prevCount === 0 && newConflicts.length > 0) {
        setUnseenConflictCount(newConflicts.length);
      }
    } catch (error) {
      console.error("Error fetching conflicts:", error);
    }
  };

  // Sync pending check-ins
  const syncCheckins = async () => {
    if (!isOnline || !user || !weddingId) return;

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

      // Only sync entries that belong to the active wedding
      const scoped = pending.filter((p) => !p.wedding_id || p.wedding_id === weddingId);

      const checks = scoped.map((item) => ({
        guest_id: item.guest_id,
        guest_email: item.guest_email,
        checked_in_at: item.checked_in_at,
        source: item.source,
        metadata: {},
      }));

      const { data, error } = await supabase.functions.invoke("sync-checkin", {
        body: { wedding_id: weddingId, checks },
      });

      if (error) throw error;

      for (const item of scoped) {
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
      await fetchRecentConflicts();
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

    if (!weddingId) {
      toast({ title: "Erro", description: "Evento ativo não identificado", variant: "destructive" });
      return;
    }

    try {
      if (isOnline) {
        const { data, error } = await supabase.functions.invoke("sync-checkin", {
          body: {
            wedding_id: weddingId,
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
        await addToOutbox({
          guest_id: guest.id,
          guest_email: guestIdentifier,
          checked_in_at,
          performed_by: user.id,
          source: "offline",
          wedding_id: weddingId,
        });

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
      const guestIdentifier = guest.email || guest.phone;
      const { data, error } = await supabase.functions.invoke("sync-checkin", {
        body: {
          wedding_id: weddingId,
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
        .eq("selected_by_guest_id", guest.id)
        .eq("wedding_id", weddingId!);

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
        .eq("selected_by_guest_id", guest.id)
        .eq("wedding_id", weddingId!);

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

  // Initial load — re-runs when active wedding changes
  useEffect(() => {
    fetchGuests();
    updatePendingCount();
    fetchRecentConflicts();
  }, [weddingId]);

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

  const CONFLICT_SEEN_KEY = `checkin_conflicts_seen_${user?.id || "anon"}`;

  const handleOpenConflictDrawer = () => {
    setUnseenConflictCount(0);
    // Persist seen state per user
    try {
      localStorage.setItem(CONFLICT_SEEN_KEY, JSON.stringify(recentConflicts.map((c) => c.id)));
    } catch {}
  };

  // On load, calculate unseen based on localStorage
  useEffect(() => {
    if (recentConflicts.length === 0) return;
    try {
      const seen = JSON.parse(localStorage.getItem(CONFLICT_SEEN_KEY) || "[]") as string[];
      const unseen = recentConflicts.filter((c) => !seen.includes(c.id)).length;
      setUnseenConflictCount(unseen);
    } catch {
      setUnseenConflictCount(recentConflicts.length);
    }
  }, [recentConflicts, user?.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Check-in</h1>
          <p className="text-muted-foreground mt-1">
            Sistema de check-in de presença de convidados na data do evento.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Sync status dot */}
          <StatusIndicator
            color={isOnline ? (pendingCount > 0 ? "yellow" : "green") : "yellow"}
            label={isOnline ? (pendingCount > 0 ? `Não sincronizado • ${pendingCount} pendência${pendingCount !== 1 ? "s" : ""}` : "Sincronizado") : "Não sincronizado"}
            ariaLabel={isOnline ? "Status de sincronização" : "Status de sincronização: offline"}
          />

          {/* Wi-Fi status icon */}
          <StatusIndicator
            color={isOnline ? "green" : "red"}
            label={isOnline ? "On-line" : "Off-line"}
            ariaLabel={isOnline ? "Conexão: on-line" : "Conexão: off-line"}
            icon={
              isOnline
                ? <Wifi className="w-4 h-4 text-green-500" />
                : <WifiOff className="w-4 h-4 text-destructive" />
            }
          />

          {/* Conflict badge with drawer */}
          <Sheet onOpenChange={(open) => open && handleOpenConflictDrawer()}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Conflitos recentes">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unseenConflictCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unseenConflictCount > 9 ? "9+" : unseenConflictCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[340px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Conflitos recentes</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {recentConflicts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum conflito registrado.
                  </p>
                ) : (
                  <>
                    {recentConflicts.slice(0, 10).map((c) => (
                      <div key={c.id} className="border rounded-md p-3 text-sm space-y-1">
                        <p className="font-medium">{c.guest_email}</p>
                        <p className="text-muted-foreground text-xs">
                          {c.metadata?.reason === "duplicate" && "Duplicado — mantido existente"}
                          {c.metadata?.reason === "older_offline" && "Offline anterior — substituído"}
                          {c.metadata?.reason === "same_timestamp" && "Mesmo horário — mantido online"}
                          {!c.metadata?.reason && "Conflito resolvido"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                            : ""}
                        </p>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => navigate(`${adminBasePath ?? "/admin"}/logs`)}
                    >
                      Ver todos os logs
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button onClick={syncCheckins} disabled={!isOnline || syncing} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

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
                             disabled={giftDelivered[guest.id] || !guest.checked_in_at}
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
    </div>
  );
};

export default Checkin;
