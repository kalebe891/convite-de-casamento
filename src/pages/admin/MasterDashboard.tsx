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
import { logAdminAction } from "@/lib/adminLogger";
import { devLog } from "@/lib/devLog";
import { CalendarDays, Plus, Users, Gift, Images, Mail, ArrowRight, Search, RefreshCw, PartyPopper, Heart, CalendarCheck, Trash2, Archive, RotateCcw, AlertTriangle, Wrench, BadgeCheck } from "lucide-react";
import { isValidThemeId } from "@/lib/themeValidation";
import CreateEventDialog from "@/components/admin/CreateEventDialog";
import DeleteTenantDialog from "@/components/admin/DeleteTenantDialog";
import TenantViewToggle, { type TenantViewMode } from "@/components/admin/TenantViewToggle";
import TenantTable from "@/components/admin/TenantTable";


const VIEW_STORAGE_KEY = "master_tenant_view";

type Wedding = {
  id: string;
  slug: string | null;
  event_type: string | null;
  theme_id: string | null;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string;
  created_at: string;
  tenant_status?: string | null;
  expires_at?: string | null;
  archived_at?: string | null;
  is_public_showcase?: boolean | null;
  is_demo?: boolean | null;
  demo_expires_at?: string | null;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Wedding | null>(null);
  const [viewMode, setViewMode] = useState<TenantViewMode>(() => {
    try {
      const v = localStorage.getItem(VIEW_STORAGE_KEY);
      return v === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("wedding_details")
      .select("id,slug,event_type,theme_id,bride_name,groom_name,wedding_date,created_at,tenant_status,expires_at,archived_at,is_public_showcase,is_demo,demo_expires_at")
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

  const handleCreate = () => setCreateOpen(true);

  const tenantDisplayName = (w: Wedding) => formatNames(w);

  const handleRenew = async (w: Wedding) => {
    const base = w.expires_at ? new Date(w.expires_at) : new Date();
    const next = new Date(base.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from("wedding_details")
      .update({ expires_at: next })
      .eq("id", w.id)
      .select();
    if (err) {
      toast({ title: "Erro ao renovar", description: err.message, variant: "destructive" });
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      devLog("Operação concluída sem alterações.");
      toast({ title: "Nenhuma alteração foi aplicada.", description: "Verifique suas permissões ou tente novamente.", variant: "destructive" });
      return;
    }
    await logAdminAction({
      action: "TENANT_RENEWED",
      tableName: "wedding_details",
      recordId: w.id,
      oldData: { expires_at: w.expires_at },
      newData: { expires_at: next },
      affectedName: tenantDisplayName(w),
      weddingId: w.id,
    });
    toast({ title: "Tenant renovado", description: "+365 dias adicionados à validade." });
    await load();
  };

  const handleArchive = async (w: Wedding) => {
    if (!window.confirm(`Arquivar o tenant "${tenantDisplayName(w)}"? Os dados serão preservados.`)) return;
    const now = new Date().toISOString();
    const { data, error: err } = await supabase
      .from("wedding_details")
      .update({ tenant_status: "archived", archived_at: now, is_public_showcase: false })
      .eq("id", w.id)
      .select();
    if (err) {
      toast({ title: "Erro ao arquivar", description: err.message, variant: "destructive" });
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      devLog("Operação concluída sem alterações.");
      toast({ title: "Nenhuma alteração foi aplicada.", description: "Verifique suas permissões ou tente novamente.", variant: "destructive" });
      return;
    }
    await logAdminAction({
      action: "TENANT_ARCHIVED",
      tableName: "wedding_details",
      recordId: w.id,
      oldData: { tenant_status: w.tenant_status, archived_at: w.archived_at, is_public_showcase: w.is_public_showcase },
      newData: { tenant_status: "archived", archived_at: now, is_public_showcase: false },
      affectedName: tenantDisplayName(w),
      weddingId: w.id,
    });
    toast({ title: "Tenant arquivado", description: "Removido da vitrine pública. Dados preservados." });
    await load();
  };
  const handleFixTheme = async (w: Wedding) => {
    const oldTheme = w.theme_id ?? null;
    if (!window.confirm(`Corrigir tema do tenant "${tenantDisplayName(w)}"? O tema atual ("${oldTheme ?? "—"}") será substituído por "legacy".`)) return;
    const { data, error: err } = await supabase
      .from("wedding_details")
      .update({ theme_id: "legacy" })
      .eq("id", w.id)
      .select();
    if (err) {
      toast({ title: "Erro ao corrigir tema", description: err.message, variant: "destructive" });
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      devLog("Operação concluída sem alterações.");
      toast({ title: "Nenhuma alteração foi aplicada.", description: "Verifique suas permissões ou tente novamente.", variant: "destructive" });
      return;
    }
    await logAdminAction({
      action: "THEME_CORRECTED",
      tableName: "wedding_details",
      recordId: w.id,
      oldData: { old_theme: oldTheme },
      newData: { new_theme: "legacy" },
      affectedName: tenantDisplayName(w),
      weddingId: w.id,
    });
    toast({ title: "Tema corrigido", description: "Tenant agora utiliza o tema legacy." });
    await load();
  };


  const handleRestore = async (w: Wedding) => {
    const { data, error: err } = await supabase
      .from("wedding_details")
      .update({ tenant_status: "active", archived_at: null })
      .eq("id", w.id)
      .select();
    if (err) {
      toast({ title: "Erro ao restaurar", description: err.message, variant: "destructive" });
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      devLog("Operação concluída sem alterações.");
      toast({ title: "Nenhuma alteração foi aplicada.", description: "Verifique suas permissões ou tente novamente.", variant: "destructive" });
      return;
    }
    await logAdminAction({
      action: "TENANT_RESTORED",
      tableName: "wedding_details",
      recordId: w.id,
      oldData: { tenant_status: w.tenant_status, archived_at: w.archived_at },
      newData: { tenant_status: "active", archived_at: null },
      affectedName: tenantDisplayName(w),
      weddingId: w.id,
    });
    toast({ title: "Tenant restaurado", description: "Tenant voltou ao estado ativo." });
    await load();
  };

  const handleConvertDemo = async (w: Wedding) => {
    if (!w.is_demo) return;
    if (!window.confirm(
      "Converter esta demonstração em uma licença definitiva?\n\nO acesso administrativo será restaurado imediatamente e o período de licença será reiniciado para 365 dias."
    )) return;
    const newExpires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from("wedding_details")
      .update({
        is_demo: false,
        tenant_status: "active",
        demo_expires_at: null,
        archived_at: null,
        expires_at: newExpires,
      })
      .eq("id", w.id)
      .select();
    if (err) {
      toast({
        title: "Não foi possível converter esta demonstração.",
        description: "Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      devLog("Operação concluída sem alterações.");
      toast({ title: "Nenhuma alteração foi aplicada.", description: "Verifique suas permissões ou tente novamente.", variant: "destructive" });
      return;
    }
    await logAdminAction({
      action: "DEMO_CONVERTED",
      tableName: "wedding_details",
      recordId: w.id,
      oldData: { is_demo: true, tenant_status: w.tenant_status ?? "active" },
      newData: { is_demo: false, tenant_status: "active", expires_at: newExpires },
      affectedName: tenantDisplayName(w),
      weddingId: w.id,
    });
    toast({
      title: "Licença ativada com sucesso.",
      description: "O acesso administrativo foi restaurado.",
    });
    await load();
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
          <Button onClick={handleCreate} className="gap-2">
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
              type="search"
              name="tenant-search"
              id="tenant-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
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
          <TenantViewToggle value={viewMode} onChange={setViewMode} />
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
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Novo Convite
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <TenantTable
          weddings={filtered}
          counts={counts}
          formatNames={formatNames}
          formatDate={formatDate}
          eventTypeLabel={eventTypeLabel}
          statusFor={(d) => statusLabel(getEventStatus(d))}
          buildUrl={(w) => buildTenantAdminUrl(w)}
          onAccess={(url) => navigate(url)}
          onDelete={(w) => setDeleteTarget(w)}
          onRenew={handleRenew}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onFixTheme={handleFixTheme}
          onConvertDemo={handleConvertDemo}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => {
            const url = buildTenantAdminUrl(w);
            const c = counts[w.id];
            const status = statusLabel(getEventStatus(w.wedding_date));
            const isArchived = w.tenant_status === "archived";
            const days = w.expires_at
              ? Math.ceil((new Date(w.expires_at).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Card key={w.id} className={`flex flex-col ${isArchived ? "opacity-80" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-serif">{formatNames(w)}</CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary">{eventTypeLabel(w.event_type)}</Badge>
                      <Badge variant={isArchived ? "outline" : "default"}>
                        {isArchived ? "Arquivado" : "Ativo"}
                      </Badge>
                      {w.is_demo && (
                        isArchived ? (
                          <Badge variant="destructive">Demo Expirada</Badge>
                        ) : (
                          <Badge variant="secondary">
                            Demo{w.demo_expires_at ? ` · expira em ${Math.max(0, Math.ceil((new Date(w.demo_expires_at).getTime() - Date.now()) / 86400000))}d` : ""}
                          </Badge>
                        )
                      )}
                      {status && <Badge variant={status.variant}>{status.label}</Badge>}
                      {!isValidThemeId(w.theme_id) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Tema Inválido
                        </Badge>
                      )}
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
                    <div className="text-muted-foreground">
                      Expira em: <span className="font-medium text-foreground">{formatDate(w.expires_at)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Dias restantes: <span className="font-medium text-foreground">{days === null ? "—" : days}</span>
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

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      className="flex-1 gap-2 min-w-[140px]"
                      variant="outline"
                      disabled={!url}
                      onClick={() => url && navigate(url)}
                    >
                      Acessar painel
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    {!isArchived ? (
                      <>
                        <Button variant="outline" size="icon" title="Renovar +365 dias" onClick={() => handleRenew(w)}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" title="Arquivar tenant" onClick={() => handleArchive(w)}>
                          <Archive className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="icon" title="Restaurar tenant" onClick={() => handleRestore(w)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    {w.is_demo && (
                      <Button
                        variant="default"
                        size="icon"
                        title="Converter em licença definitiva"
                        onClick={() => handleConvertDemo(w)}
                      >
                        <BadgeCheck className="w-4 h-4" />
                      </Button>
                    )}
                    {!isValidThemeId(w.theme_id) && (
                      <Button
                        variant="outline"
                        size="icon"
                        title="Corrigir tema inválido (define legacy)"
                        onClick={() => handleFixTheme(w)}
                      >
                        <Wrench className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      title="Excluir evento"
                      onClick={() => setDeleteTarget(w)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      <DeleteTenantDialog
        tenant={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onDeleted={load}
      />
    </div>
  );
}
