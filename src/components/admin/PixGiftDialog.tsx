import { useState, useRef, useEffect } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorHandling";
import { logAdminAction } from "@/lib/adminLogger";
import { Loader2, Copy, Upload, QrCode } from "lucide-react";

interface PixGiftDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weddingId: string;
  onCreated: () => void;
  itemsCount: number;
}

type PixMode = "free" | "fixed";
type Source = "upload" | "code";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

async function compressToWebP(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const maxDim = 1024;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", 0.9)
  );
}

const PixGiftDialog = ({ open, onOpenChange, weddingId, onCreated, itemsCount }: PixGiftDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pixMode, setPixMode] = useState<PixMode>("free");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [source, setSource] = useState<Source>("code");
  const [pixCode, setPixCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setPixMode("free");
      setTitle("");
      setDescription("");
      setAmount("");
      setSource("code");
      setPixCode("");
      setFile(null);
      setPreview("");
    }
  }, [open]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const canAdvance1 = true;
  const canAdvance2 = title.trim().length > 0 && (pixMode === "free" || (pixMode === "fixed" && parseFloat(amount) > 0));
  const canSave =
    canAdvance2 &&
    ((source === "code" && pixCode.trim().length > 0) || (source === "upload" && !!file));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      toast({ title: "Copiado", description: "Código PIX copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let qr_image_url: string | null = null;

      if (source === "upload" && file) {
        const blob = await compressToWebP(file);
        const fileName = `${crypto.randomUUID()}.webp`;
        const filePath = `${weddingId}/pix/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("wedding-photos")
          .upload(filePath, blob, { contentType: "image/webp" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("wedding-photos").getPublicUrl(filePath);
        qr_image_url = data.publicUrl;
      }

      const payload = {
        wedding_id: weddingId,
        gift_name: title.trim(),
        description: description.trim() || null,
        is_public: true,
        display_order: itemsCount,
        gift_kind: "pix_manual",
        pix_mode: pixMode,
        pix_copy_paste_code: source === "code" ? pixCode.trim() : null,
        qr_image_url,
        suggested_amount: pixMode === "fixed" ? parseFloat(amount) : null,
      };

      const { data, error } = await supabase.from("gift_items").insert(payload).select().single();
      if (error) throw error;

      await logAdminAction({
        action: "insert",
        tableName: "gift_items",
        recordId: data?.id,
        newData: payload,
        affectedName: payload.gift_name,
      });

      toast({ title: "Sucesso", description: "Presente PIX criado!" });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Erro", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Novo Presente PIX
          </DialogTitle>
          <DialogDescription>
            Etapa {step} de 3 — {step === 1 ? "Tipo do PIX" : step === 2 ? "Informações" : "QR Code"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Label>Tipo do PIX</Label>
            <RadioGroup value={pixMode} onValueChange={(v) => setPixMode(v as PixMode)}>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <RadioGroupItem value="free" id="pix-free" />
                <Label htmlFor="pix-free" className="font-normal cursor-pointer">
                  PIX QR Code sem valor definido (contribuição livre)
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <RadioGroupItem value="fixed" id="pix-fixed" />
                <Label htmlFor="pix-fixed" className="font-normal cursor-pointer">
                  PIX QR Code com valor específico
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: PIX – Lua de Mel"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mensagem opcional para os convidados"
              />
            </div>
            {pixMode === "fixed" && (
              <div>
                <Label>Valor sugerido (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Label>Origem do QR Code</Label>
            <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)}>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <RadioGroupItem value="upload" id="src-upload" />
                <Label htmlFor="src-upload" className="font-normal cursor-pointer">
                  Upload de imagem do QR Code
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <RadioGroupItem value="code" id="src-code" />
                <Label htmlFor="src-code" className="font-normal cursor-pointer">
                  Código PIX (Copia e Cola)
                </Label>
              </div>
            </RadioGroup>

            {source === "upload" && (
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  {file ? "Trocar imagem" : "Selecionar imagem"}
                </Button>
                <p className="text-xs text-muted-foreground">Máx. 2 MB. Convertido para WebP automaticamente.</p>
                {preview && (
                  <img src={preview} alt="Pré-visualização do QR Code" className="w-48 h-48 object-contain border rounded-md bg-white" />
                )}
              </div>
            )}

            {source === "code" && (
              <div className="space-y-3">
                <div>
                  <Label>Código PIX *</Label>
                  <Textarea
                    value={pixCode}
                    onChange={(e) => setPixCode(e.target.value)}
                    placeholder="Cole aqui o código PIX Copia e Cola"
                    rows={4}
                  />
                </div>
                {pixCode.trim().length > 0 && (
                  <div className="flex flex-col items-center gap-3 p-4 border rounded-md bg-white">
                    <QRCodeCanvas value={pixCode.trim()} size={192} includeMargin />
                    <div className="hidden">
                      <QRCodeSVG value={pixCode.trim()} size={192} />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar código
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={saving}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            {step < 3 && (
              <Button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !canAdvance1) || (step === 2 && !canAdvance2)}
              >
                Continuar
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSave} disabled={!canSave || saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar PIX
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PixGiftDialog;
