import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWedding } from "@/contexts/WeddingContext";
import { logAdminAction } from "@/lib/adminLogger";
import { resolveThemeId, type TenantThemeId } from "@/themes/registry";

interface Props {
  permissions: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
}

const WeddingThemeForm = ({ permissions }: Props) => {
  const { toast } = useToast();
  const { weddingId } = useWedding();
  const [loading, setLoading] = useState(false);
  const [themeId, setThemeId] = useState<TenantThemeId>("legacy");
  const [initialTheme, setInitialTheme] = useState<TenantThemeId>("legacy");

  useEffect(() => {
    const fetch = async () => {
      if (!weddingId) return;
      const { data } = await supabase
        .from("wedding_details")
        .select("theme_id")
        .eq("id", weddingId)
        .maybeSingle();
      const resolved = resolveThemeId((data as { theme_id?: string } | null)?.theme_id);
      setThemeId(resolved);
      setInitialTheme(resolved);
    };
    fetch();
  }, [weddingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("wedding_details")
        .update({ theme_id: themeId })
        .eq("id", weddingId);
      if (error) throw error;

      await logAdminAction({
        action: "update",
        tableName: "wedding_details",
        recordId: weddingId,
        oldData: { theme_id: initialTheme },
        newData: { theme_id: themeId },
        affectedName: "Tema do Convite",
      });

      setInitialTheme(themeId);
      toast({ title: "Sucesso!", description: "Tema atualizado." });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao salvar o tema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tema do Convite</CardTitle>
        <CardDescription>
          Escolha a aparência da página pública deste convite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme-select">Tema</Label>
            <Select
              value={themeId}
              onValueChange={(v) => setThemeId(v as TenantThemeId)}
              disabled={!permissions.canEdit}
            >
              <SelectTrigger id="theme-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="legacy">Legacy (Romântico clássico)</SelectItem>
                <SelectItem value="editorial">Editorial</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="modern-noir">Modern Noir</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A alteração é refletida imediatamente na página pública do convite.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !permissions.canEdit || themeId === initialTheme}
          >
            {loading
              ? "Salvando..."
              : permissions.canEdit
              ? "Salvar Tema"
              : "Somente Leitura"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default WeddingThemeForm;
