import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { buildTenantAdminUrl, isReservedSlug } from "@/lib/eventType";

type EventType = "wedding" | "birthday";
type ThemeId = "legacy" | "editorial";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function CreateEventDialog({ open, onOpenChange, onCreated }: Props) {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [themeId, setThemeId] = useState<ThemeId>("legacy");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (!open) {
      setEventType("wedding");
      setName("");
      setSlug("");
      setSlugTouched(false);
      setEventDate("");
      setThemeId("legacy");
      setSubmitting(false);
    }
  }, [open]);

  const validate = (): string | null => {
    if (!eventType) return "Informe o tipo do evento.";
    if (!name.trim()) return "Informe o nome do evento.";
    if (!slug.trim()) return "Informe o slug.";
    if (slug !== slug.toLowerCase()) return "O slug deve estar em minúsculas.";
    if (!SLUG_RE.test(slug))
      return "O slug deve conter apenas letras minúsculas, números e hífen (sem espaços, acentos ou hífen no início/fim/duplicado).";
    if (isReservedSlug(slug)) return "Este slug é reservado.";
    if (!eventDate) return "Informe a data do evento.";
    return null;
  };

  const mapError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("slug já está em uso")) return "Este slug já está em uso. Escolha outro.";
    if (m.includes("tipo de evento inválido")) return "Tipo de evento inválido.";
    if (m.includes("sem permissão")) return "Você não tem permissão para criar eventos.";
    if (m.includes("não autenticado")) return "Sessão expirada. Faça login novamente.";
    return "Não foi possível criar o convite. Tente novamente.";
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Verifique os campos", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: newId, error } = await supabase.rpc("create_new_event", {
        _slug: slug,
        _event_type: eventType,
        _primary_name: name.trim(),
        _secondary_name: "A definir",
        _event_date: eventDate,
        _theme_id: themeId,
      });

      if (error) {
        console.error("create_new_event error", error);
        toast({
          title: "Erro ao criar convite",
          description: mapError(error.message ?? ""),
          variant: "destructive",
        });
        return;
      }

      const { data: wedding, error: fetchErr } = await supabase
        .from("wedding_details")
        .select("id, slug, event_type")
        .eq("id", newId as string)
        .maybeSingle();

      if (fetchErr || !wedding) {
        console.error("fetch new wedding error", fetchErr);
        toast({
          title: "Convite criado",
          description: "Criado com sucesso, mas não foi possível abrir o painel automaticamente.",
        });
        onOpenChange(false);
        onCreated?.();
        return;
      }

      const url = buildTenantAdminUrl(wedding);
      toast({ title: "Convite criado com sucesso." });
      onOpenChange(false);
      onCreated?.();
      if (url) navigate(url);
    } catch (e: any) {
      console.error("create_new_event exception", e);
      toast({
        title: "Erro ao criar convite",
        description: "Não foi possível criar o convite. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Convite</DialogTitle>
          <DialogDescription>Cadastre um novo evento na plataforma.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo do evento</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="wedding">Casamento</SelectItem>
                <SelectItem value="birthday">Aniversário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-name">Nome do evento</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={eventType === "wedding" ? "Beatriz e Diogo" : "Maria 15 anos"}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-slug">Slug</Label>
            <Input
              id="event-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="beatriz-e-diogo"
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">
              Endereço público: /{eventType === "wedding" ? "casamento" : "aniversario"}/{slug || "..."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-date">Data do evento</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Criando..." : "Criar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
