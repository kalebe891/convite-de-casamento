/**
 * Fonte única de verdade para montagem de links de WhatsApp.
 *
 * Extraído do fluxo de RSVP (GuestsManager) na Etapa 1.28.00.
 * Regra preservada integralmente:
 *  - remove tudo que não é dígito;
 *  - prefixa "55" quando ausente (apenas no link, nunca no banco);
 *  - encoda a mensagem via encodeURIComponent;
 *  - link final: https://wa.me/{phone}?text={message}
 *
 * O link NUNCA é persistido — sempre montado em tempo de execução.
 */

export const normalizeWhatsAppPhone = (raw: string): string => {
  let phone = (raw || "").replace(/\D/g, "");
  if (phone && !phone.startsWith("55")) {
    phone = "55" + phone;
  }
  return phone;
};

export const buildWhatsAppLink = (raw: string, message: string): string | null => {
  const phone = normalizeWhatsAppPhone(raw);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message ?? "")}`;
};

export const openWhatsApp = (raw: string, message: string): boolean => {
  const link = buildWhatsAppLink(raw, message);
  if (!link) return false;
  window.open(link, "_blank", "noopener,noreferrer");
  return true;
};
