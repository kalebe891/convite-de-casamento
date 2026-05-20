import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { buildTenantAdminUrl } from "@/lib/eventType";
import { CalendarDays, Plus, Users, Gift, Images, Mail, ArrowRight, Search, RefreshCw, PartyPopper, Heart, CalendarCheck } from "lucide-react";
import CreateEventDialog from "@/components/admin/CreateEventDialog";

type Wedding = {
  id: string;
  slug: string | null;
  event_type: string | null;
  theme_id: string | null;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string;
  created_at: string;
};

type Counts = {
  guests: number;
  gifts: number;
  photos: number;
  invitations: number;
};

function eventTypeLabel(t: string | null) {
  if (t === "wedding") return "Casamento";
  if (t === "birthday") return "Aniversário";
  return "Evento";
}

function formatNames(w: Wedding) {
  const a = (w.bride_name ?? "").trim();
  const b = (w.groom_name ?? "").trim();
  const ua = !a || a.toLowerCase() === "a definir";
  const ub = !b || b.toLowerCase() === "a definir";
  if (ua && ub) return w.slug ?? "Sem nome";
  if (ua) return b;
  if (ub) return a;
  return `${a} & ${b}`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return d;
  }
}

type EventStatus = "future" | "soon" | "past";
function getEventStatus(date: string | null | undefined): EventStatus | null {
  if (!date) return null;
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return null;
  const now = Date.now();
  const diffDays = (d - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "past";
  if (diffDays <= 30) return "soon";
  return "future";
}

function statusLabel(s: EventStatus | null) {
  if (s === "future") return { label: "Futuro", variant: "secondary" as const };
  if (s === "soon") return { label: "Em breve", variant: "default" as const };
  if (s === "past") return { label: "Realizado", variant: "outline" as const };
  return null;
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("wedding_details")
      .select("id,slug,event_type,theme_id,bride_name,groom_name,wedding_date,created_at")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as Wedding[];
    setWeddings(list);
    setLoading(false);

    // Fetch counts per tenant (scoped by wedding_id)
    const results = await Promise.all(
      list.map(async (w) => {
        const [g, gi, ph, inv] = await Promise.all([
          supabase.from("guests").select("id", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("gift_items").select("id", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("photos").select("id", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("invitations").select("id", { count: "exact", head: true }).eq("wedding_id", w.id),
        ]);
        return [
          w.id,
          {
            guests: g.count ?? 0,
            gifts: gi.count ?? 0,
            photos: ph.count ?? 0,
            invitations: inv.count ?? 0,
          },
        ] as const;
      })
    );
    setCounts(Object.fromEntries(results));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = weddings;
    if (typeFilter !== "all") list = list.filter((w) => w.event_type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (w) =>
          (w.slug ?? "").toLowerCase().includes(q) ||
          (w.bride_name ?? "").toLowerCase().includes(q) ||
          (w.groom_name ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "event_date":
          return (a.wedding_date ?? "").localeCompare(b.wedding_date ?? "");
        case "name":
          return formatNames(a).localeCompare(formatNames(b));
        case "slug":
          return (a.slug ?? "").localeCompare(b.slug ?? "");
        default:
          return 0;
      }
    });
    return sorted;
  }, [weddings, search, typeFilter, sortBy]);

  const handleCreate = () => {
    toast({
      title: "Em breve",
      description: "Criação de novo convite estará disponível na próxima fase.",
    });
  };

  const summary = useMemo(() => {
    const total = weddings.length;
    const weddingCount = weddings.filter((w) => w.event_type === "wedding").length;
    const birthdayCount = weddings.filter((w) => w.event_type === "birthday").length;
    const guests = Object.values(counts).reduce((s, c) => s + (c?.guests ?? 0), 0);
    return { total, weddingCount, birthdayCount, guests };
  }, [weddings, counts]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os convites e eventos da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={handleCreate} disabled className="gap-2" title="Disponível na próxima fase">
            <Plus className="w-4 h-4" />
            Criar Novo Convite
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total de eventos", value: summary.total, icon: CalendarCheck },
          { label: "Casamentos", value: summary.weddingCount, icon: Heart },
          { label: "Aniversários", value: summary.birthdayCount, icon: PartyPopper },
          { label: "Convidados", value: summary.guests, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold leading-tight">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por slug ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="wedding">Casamento</SelectItem>
              <SelectItem value="birthday">Aniversário</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="created_desc">Mais recentes</SelectItem>
              <SelectItem value="event_date">Data do evento</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="slug">Slug</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando eventos...</p>
      ) : error ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-destructive">Erro ao carregar eventos: {error}</p>
            <Button variant="outline" onClick={load}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <p className="text-muted-foreground">
              {weddings.length === 0
                ? "Nenhum evento cadastrado ainda."
                : "Nenhum evento encontrado com os filtros atuais."}
            </p>
            {weddings.length === 0 && (
              <Button onClick={handleCreate} disabled className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Novo Convite
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => {
            const url = buildTenantAdminUrl(w);
            const c = counts[w.id];
            const status = statusLabel(getEventStatus(w.wedding_date));
            return (
              <Card key={w.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-serif">{formatNames(w)}</CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary">{eventTypeLabel(w.event_type)}</Badge>
                      {status && <Badge variant={status.variant}>{status.label}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">/{w.slug}</p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Evento: {formatDate(w.wedding_date)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Tema: <span className="font-medium text-foreground">{w.theme_id ?? "default"}</span>
                    </div>
                    <div className="text-muted-foreground col-span-2">
                      Criado em {formatDate(w.created_at)}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40">
                    <div className="flex flex-col items-center text-xs">
                      <Users className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="font-medium">{c?.guests ?? "—"}</span>
                      <span className="text-[10px] text-muted-foreground">Convidados</span>
                    </div>
                    <div className="flex flex-col items-center text-xs">
                      <Gift className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="font-medium">{c?.gifts ?? "—"}</span>
                      <span className="text-[10px] text-muted-foreground">Presentes</span>
                    </div>
                    <div className="flex flex-col items-center text-xs">
                      <Images className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="font-medium">{c?.photos ?? "—"}</span>
                      <span className="text-[10px] text-muted-foreground">Fotos</span>
                    </div>
                    <div className="flex flex-col items-center text-xs">
                      <Mail className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="font-medium">{c?.invitations ?? "—"}</span>
                      <span className="text-[10px] text-muted-foreground">Convites</span>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    disabled={!url}
                    onClick={() => url && navigate(url)}
                  >
                    Acessar painel
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
