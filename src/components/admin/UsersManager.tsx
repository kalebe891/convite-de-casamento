import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import UsersList from "./UsersList";

const UsersManager = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "couple" | "planner">("admin");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { email, role },
      });

      if (error) throw error;

      if (data?.magic_link) {
        setMagicLink(data.magic_link);
        toast({
          title: "Convite processado!",
          description: `Link de acesso gerado. ${data.method === 'backend_invite' ? 'Email enviado com sucesso.' : 'Copie o link abaixo para enviar manualmente.'}`,
        });
      } else {
        toast({
          title: "Convite enviado!",
          description: `Um convite foi enviado para ${email}`,
        });
      }

      setEmail("");
      setRole("admin");
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Convidar Novo Usuário</CardTitle>
          <CardDescription>
            Convide administradores, membros do casal ou cerimonialistas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do Usuário</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Acesso</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="couple">Casal</SelectItem>
                  <SelectItem value="planner">Cerimonialista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              <Mail className="w-4 h-4" />
              {loading ? "Enviando..." : "Enviar Convite"}
            </Button>
          </form>

          {magicLink && (
            <div className="mt-6 p-4 bg-accent/10 border border-accent rounded-lg">
              <p className="text-sm font-semibold mb-3 text-accent-foreground">🔑 Link de Acesso Gerado</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={magicLink}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(magicLink);
                    toast({
                      title: "Link copiado!",
                      description: "O link foi copiado para a área de transferência",
                    });
                  }}
                >
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ⚠️ Envie este link manualmente para o usuário acessar e criar sua senha
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Como funciona:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Digite o e-mail do usuário que deseja convidar</li>
              <li>Selecione o tipo de acesso apropriado</li>
              <li>O usuário receberá um e-mail com instruções para criar a senha</li>
              <li>Após criar a senha, ele poderá acessar o painel administrativo</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <UsersList key={refreshKey} />
    </div>
  );
};

export default UsersManager;
