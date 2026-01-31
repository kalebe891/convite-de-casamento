import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";

interface RSVPSectionProps {
  weddingId: string | undefined;
  invitationCode?: string; // Token do convite para usar a Edge Function
}

const rsvpSchema = z.object({
  guestName: z.string().trim().min(1, "Name is required").max(100),
  guestEmail: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  guestPhone: z.string().trim().max(20).optional().or(z.literal("")),
  dietaryRestrictions: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

const RSVPSection = ({ weddingId, invitationCode }: RSVPSectionProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    attending: true,
    plusOne: false,
    dietaryRestrictions: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = rsvpSchema.parse(formData);
      setSubmitting(true);

      // Usar a Edge Function com rate limiting em vez de insert direto
      const { data, error } = await supabase.functions.invoke('rsvp-respond', {
        body: {
          token: invitationCode || '',
          attending: formData.attending,
          plus_one: formData.plusOne,
          dietary_restrictions: validatedData.dietaryRestrictions || undefined,
          message: validatedData.message || undefined,
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar resposta');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "RSVP Submitted!",
        description: "Thank you for your response. We can't wait to celebrate with you!",
      });

      setFormData({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        attending: true,
        plusOne: false,
        dietaryRestrictions: "",
        message: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit RSVP. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Mostrar mensagem se não houver código de convite
  if (!invitationCode) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
            RSVP
          </h2>
          <Card className="max-w-2xl mx-auto shadow-elegant animate-fade-in">
            <CardHeader>
              <CardTitle className="text-3xl font-serif text-center">Acesso Restrito</CardTitle>
              <CardDescription className="text-center text-lg">
                Para confirmar sua presença, utilize o link do convite que você recebeu.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl font-serif font-bold text-center mb-16 text-foreground">
          RSVP
        </h2>
        
        <Card className="max-w-2xl mx-auto shadow-elegant animate-fade-in">
          <CardHeader>
            <CardTitle className="text-3xl font-serif text-center">Join Our Celebration</CardTitle>
            <CardDescription className="text-center text-lg">
              Please let us know if you'll be able to attend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="guestName">Full Name *</Label>
                <Input
                  id="guestName"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestEmail">Email</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestPhone">Phone</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  maxLength={20}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label htmlFor="attending" className="text-base">
                  Will you be attending?
                </Label>
                <Switch
                  id="attending"
                  checked={formData.attending}
                  onCheckedChange={(checked) => setFormData({ ...formData, attending: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label htmlFor="plusOne" className="text-base">
                  Bringing a plus one?
                </Label>
                <Switch
                  id="plusOne"
                  checked={formData.plusOne}
                  onCheckedChange={(checked) => setFormData({ ...formData, plusOne: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dietary">Dietary Restrictions</Label>
                <Input
                  id="dietary"
                  value={formData.dietaryRestrictions}
                  onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message to the Couple</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full text-lg py-6" 
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit RSVP"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default RSVPSection;
