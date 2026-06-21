import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export interface PixQrViewerData {
  gift_name: string;
  description?: string | null;
  qr_image_url?: string | null;
  pix_copy_paste_code?: string | null;
}

interface PixQrViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pix: PixQrViewerData | null;
}

const PixQrViewerDialog = ({ open, onOpenChange, pix }: PixQrViewerDialogProps) => {
  const handleCopy = async () => {
    if (!pix?.pix_copy_paste_code) return;
    try {
      await navigator.clipboard.writeText(pix.pix_copy_paste_code);
      toast.success("Código PIX copiado.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>PIX • {pix?.gift_name}</DialogTitle>
          {pix?.description && (
            <DialogDescription>{pix.description}</DialogDescription>
          )}
        </DialogHeader>
        {pix && (
          <div className="space-y-4">
            {pix.qr_image_url && (
              <button
                type="button"
                onClick={handleCopy}
                className="block w-full rounded-xl overflow-hidden border border-border bg-white p-4 transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Copiar código PIX"
                title="Clique para copiar o código PIX"
              >
                <img
                  src={pix.qr_image_url}
                  alt={`QR Code PIX ${pix.gift_name}`}
                  className="mx-auto max-h-64 object-contain"
                />
              </button>
            )}
            {pix.pix_copy_paste_code && (
              <>
                <Textarea
                  readOnly
                  value={pix.pix_copy_paste_code}
                  className="font-mono text-xs h-28"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button className="w-full" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar código PIX
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PixQrViewerDialog;
