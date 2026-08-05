import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  getActivationLinkConfig,
  saveActivationLinkConfig,
} from "@/lib/activationLink";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Etapa 1.28.00 — Modal "Link de ativação" (Master Admin).
 *
 * Persiste SOMENTE telefone e mensagem.
 * O link WhatsApp é montado em tempo de execução reutilizando
 * o helper único do projeto (src/lib/whatsapp.ts, extraído do RSVP).
 */
const ActivationLinkDialog = ({ open, onOpenChange }: Props) => {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      const config = getActivationLinkConfig();
      setPhone(config.phone);
      setMessage(config.message);
    }
  }, [open]);

  const link = buildWhatsAppLink(phone, message);

  const handleSave = () => {
    if (!phone.replace(/\D/g, "")) {
      toast({
        title: "Número obrigatório",
        description: "Informe um número de WhatsApp válido.",
        variant: "destructive",
      });
      return;
    }
    saveActivationLinkConfig({ phone, message });
    toast({ title: "Link de ativação salvo" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link de ativação</DialogTitle>
          <DialogDescription>
            Apenas número e mensagem são salvos. O link é gerado em tempo de
            execução.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activation-phone">Número</Label>
            <Input
              id="activation-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="62 99248-5994"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activation-message">Mensagem</Label>
            <Textarea
              id="activation-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá, quero ativar meu convite digital."
            />
          </div>

          <div className="space-y-2">
            <Label>Link WhatsApp</Label>
            <p className="text-xs font-mono break-all rounded-md border border-border bg-muted/40 p-2 text-muted-foreground">
              {link ?? "—"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActivationLinkDialog;
