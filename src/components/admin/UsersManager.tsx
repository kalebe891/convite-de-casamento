import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Mail, MessageCircle } from "lucide-react";
import UsersList from "./UsersList";
import PendingInvitesList from "./PendingInvitesList";

interface UsersManagerProps {
  onSelectUser?: (user: { id: string; name: string } | null) => void;
}

const UsersManager = ({ onSelectUser }: UsersManagerProps = {}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<"admin" | "couple" | "planner">("couple");
  const [loading, setLoading] = useState(false);
  const [magicLink, setMagicLink] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe o email do usuário.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setMagicLink("");

    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: {
          email: email.trim(),
          nome: nome.trim() || null,
          role,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Convite enviado!",
        description: `Um email de convite foi enviado para ${email}`,
      });

      if (data?.invitation_link) {
        setMagicLink(data.invitation_link);
        if (!data?.email_sent) {
          toast({
            title: "Email não enviado",
            description: "O convite foi criado, mas o email não pôde ser enviado. Use o link abaixo para compartilhar manualmente.",
            variant: "destructive",
          });
        }
      }

      setEmail("");
      setNome("");
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Não foi possível enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppMessage = () => {
    const name = nome.trim() || "Convidado";
    return `Olá ${name}! 🎉\n\nEstamos te convidando para acessar o sistema de gerenciamento do nosso casamento! ❤️\n\nClique no link abaixo para criar sua senha e começar:\n${magicLink}\n\nSe tiver qualquer dúvida, estamos à disposição!`;
  };

  const copyMagicLink = () => {
    navigator.clipboard.writeText(magicLink);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const openWhatsApp = () => {
    const message = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Convidar Novo Usuário</CardTitle>
          <CardDescription>
            Convide administradores, membros do casal ou cerimonialistas para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Usuário (Opcional)</Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email do Usuário</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Papel no Sistema</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="couple">Casal</SelectItem>
                  <SelectItem value="planner">Cerimonialista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando convite...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Convite por Email
                </>
              )}
            </Button>

            {magicLink && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <Label className="text-sm font-medium">Link de Convite Gerado</Label>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyMagicLink}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const message = getWhatsAppMessage();
                        navigator.clipboard.writeText(message);
                        toast({
                          title: "Mensagem copiada!",
                          description: "A mensagem para WhatsApp foi copiada.",
                        });
                      }}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Copiar Mensagem
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={openWhatsApp}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2 fill-current" />
                      Abrir WhatsApp
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-background rounded border text-xs font-mono break-all">
                  {magicLink}
                </div>

                <div className="p-3 bg-background rounded border">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {getWhatsAppMessage()}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  O link expira em 48 horas e só pode ser usado uma vez.
                </p>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Como funciona:</strong>
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 mt-2">
                <li>Um email será enviado automaticamente com o link de convite</li>
                <li>Se o email falhar, você pode copiar o link ou a mensagem para enviar manualmente</li>
                <li>O usuário receberá um link para criar sua própria senha</li>
                <li>Após criar a senha, ele poderá fazer login no sistema</li>
              </ol>
            </div>
          </form>
        </CardContent>
      </Card>

      <PendingInvitesList refreshTrigger={refreshKey} />
      
      <UsersList refreshKey={refreshKey} onSelectUser={onSelectUser} />
    </div>
  );
};

export default UsersManager;
