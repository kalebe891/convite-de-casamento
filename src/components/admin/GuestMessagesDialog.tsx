import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Heart, HeartOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Invitation {
  id: string;
  guest_name: string;
  message: string | null;
  attending: boolean | null;
  responded_at: string | null;
}

const GuestMessagesDialog = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMessages();
    }
  }, [open]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, guest_name, message, attending, responded_at")
        .not("message", "is", null)
        .order("guest_name", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
        >
          <MessageSquare className="h-4 w-4" />
          Ver Mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            Mensagens dos Convidados
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando mensagens...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem deixada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((invitation) => (
                <Card key={invitation.id} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        {invitation.attending ? (
                          <Heart className="w-5 h-5 text-primary" />
                        ) : (
                          <HeartOff className="w-5 h-5 text-muted-foreground" />
                        )}
                        {invitation.guest_name}
                      </CardTitle>
                      <Badge variant={invitation.attending ? "default" : "secondary"}>
                        {invitation.attending ? "Confirmado" : "Recusou"}
                      </Badge>
                    </div>
                    {invitation.responded_at && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invitation.responded_at)}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">
                      {invitation.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GuestMessagesDialog;
