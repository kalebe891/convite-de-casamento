import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Heart } from "lucide-react";

const RSVP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      toast.error("Link inválido");
      setLoading(false);
      return;
    }

    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from("rsvp_tokens")
        .select(`
          *,
          guests (
            id,
            name,
            status
          )
        `)
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        toast.error("Link inválido ou expirado");
        setLoading(false);
        return;
      }

      if (tokenData.used) {
        toast.error("Este convite já foi respondido");
        setLoading(false);
        return;
      }

      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        toast.error("Este convite expirou");
        setLoading(false);
        return;
      }

      setGuestName((tokenData.guests as any).name);
      setTokenValid(true);
    } catch (error) {
      console.error("Error validating token:", error);
      toast.error("Erro ao validar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (attending: boolean) => {
    setSubmitting(true);

    try {
      // Get token data
      const { data: tokenData, error: tokenError } = await supabase
        .from("rsvp_tokens")
        .select("guest_id")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        throw new Error("Token não encontrado");
      }

      // Update guest status
      const { error: updateError } = await supabase
        .from("guests")
        .update({ status: attending ? "confirmed" : "declined" })
        .eq("id", tokenData.guest_id);

      if (updateError) throw updateError;

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from("rsvp_tokens")
        .update({ used: true })
        .eq("token", token);

      if (tokenUpdateError) throw tokenUpdateError;

      setSubmitted(true);
      toast.success(
        attending
          ? "Confirmação registrada! Até breve! 🎉"
          : "Resposta registrada. Sentiremos sua falta! 💔"
      );
    } catch (error: any) {
      console.error("Error submitting response:", error);
      toast.error("Erro ao registrar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Este link de convite não é válido ou já expirou.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Heart className="h-16 w-16 text-pink-500 fill-pink-500" />
            </div>
            <CardTitle className="text-center text-2xl">Obrigado!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              Sua resposta foi registrada com sucesso.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Heart className="h-16 w-16 text-pink-500 fill-pink-500" />
          </div>
          <CardTitle className="text-center text-2xl">
            Você está convidado!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Olá, {guestName}!</p>
            <p className="text-muted-foreground">
              Estamos muito felizes em convidá-lo(a) para celebrar conosco este
              momento tão especial! ❤️
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-center font-medium">Você irá ao casamento?</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleResponse(true)}
                disabled={submitting}
                className="h-20 text-lg"
                variant="outline"
              >
                <Check className="h-6 w-6 mr-2" />
                Sim, vou!
              </Button>
              <Button
                onClick={() => handleResponse(false)}
                disabled={submitting}
                className="h-20 text-lg"
                variant="outline"
              >
                <X className="h-6 w-6 mr-2" />
                Não posso
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RSVP;
