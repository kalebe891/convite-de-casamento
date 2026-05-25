import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const CriarSenha = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const token = searchParams.get("t");

  // Load pending user data
  useEffect(() => {
    const loadInviteData = async () => {
      if (!token) {
        toast({
          title: "Link inválido",
          description: "O link de convite está incompleto ou inválido.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pending_users')
          .select('email, nome, papel, expires_at, usado')
          .eq('token', token)
          .single();

        if (error || !data) {
          toast({
            title: "Convite inválido",
            description: "Este convite não existe ou o link está incorreto.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Check if token was already used
        if (data.usado) {
          toast({
            title: "Convite já utilizado",
            description: "Este convite já foi usado. Solicite um novo convite ao administrador.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Check if token expired (48 hours)
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        if (expiresAt <= now) {
          toast({
            title: "Convite expirado",
            description: "Este convite expirou. Solicite um novo convite ao administrador.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setEmail(data.email);
        setFullName(data.nome || '');
        setRole(data.papel);
      } catch (error) {
        console.error('Error loading invite:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do convite.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadInviteData();
  }, [token, navigate, toast]);

  const getRoleName = (roleKey: string): string => {
    const roleMap: Record<string, string> = {
      admin: 'Administrador',
      couple: 'Casal',
      planner: 'Cerimonialista',
    };
    return roleMap[roleKey] || roleKey;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome completo.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Call Edge Function to create user
      const { data, error } = await supabase.functions.invoke('complete-user-invite', {
        body: {
          token,
          email,
          password,
          full_name: fullName.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log('✅ [CriarSenha] Account created successfully');
      const tenant = (data as any)?.tenant as { slug: string | null; event_type: string | null } | null;
      const weddingId = (data as any)?.wedding_id as string | null;

      toast({
        title: "Conta criada com sucesso!",
        description: "Finalizando seu acesso...",
      });

      // Sign in with the new credentials
      console.log('🔐 [CriarSenha] Signing in with new credentials');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ [CriarSenha] Sign in error:', signInError);
        throw signInError;
      }

      // Determine destination
      let destination = "/admin";
      if (tenant?.slug && tenant?.event_type) {
        const urlType = tenant.event_type === "birthday" ? "aniversario" : "casamento";
        destination = `/${urlType}/${tenant.slug}/admin`;
      }

      // Race-condition guard: poll user_weddings until the link is visible
      // to this session before letting TenantAdminGuard evaluate access.
      const userId = signInData?.user?.id;
      if (userId && weddingId) {
        for (let i = 0; i < 10; i++) {
          const { data: hasAccess } = await supabase.rpc("user_has_wedding_access", {
            _user_id: userId,
            _wedding_id: weddingId,
          });
          if (hasAccess) break;
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      console.log('✅ [CriarSenha] Redirecting to', destination);
      toast({
        title: "Bem-vindo!",
        description: "Preparando seu painel...",
      });

      navigate(destination, { replace: true });

    } catch (error: any) {
      console.error("Error completing invitation:", error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Não foi possível completar o cadastro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Criar Senha</CardTitle>
          <CardDescription>
            Você foi convidado como <strong>{getRoleName(role)}</strong>. Complete seu cadastro para acessar o painel administrativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Digite seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar Conta e Acessar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CriarSenha;
