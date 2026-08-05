/**
 * Configuração do "Link de ativação" (Etapa 1.28.00).
 *
 * PERSISTÊNCIA:
 *  - Salva SOMENTE telefone e mensagem.
 *  - NUNCA salva o link pronto — ele é montado em tempo de execução
 *    por `buildWhatsAppLink` (src/lib/whatsapp.ts).
 *
 * DÉBITO TÉCNICO / DOCUMENTAÇÃO (nenhuma migration nesta etapa):
 *  Não existe hoje tabela/campo de configuração global da plataforma.
 *  Para tornar a configuração compartilhada entre usuários seria necessário
 *  criar, em etapa futura:
 *    - tabela `platform_settings` (ou campos em wedding_details) com:
 *        activation_phone   text
 *        activation_message text
 *  Enquanto isso, a configuração é persistida localmente (localStorage)
 *  no navegador do Master Admin, com fallback para os valores padrão abaixo.
 */

const STORAGE_KEY = "activation_link_config";

export const DEFAULT_ACTIVATION_PHONE = "5562992485994";
export const DEFAULT_ACTIVATION_MESSAGE =
  "Olá, quero ativar meu convite digital e continuar exatamente de onde parei.";

export interface ActivationLinkConfig {
  phone: string;
  message: string;
}

export const getActivationLinkConfig = (): ActivationLinkConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ActivationLinkConfig>;
      return {
        phone: parsed.phone?.trim() || DEFAULT_ACTIVATION_PHONE,
        message: parsed.message?.trim() || DEFAULT_ACTIVATION_MESSAGE,
      };
    }
  } catch {
    // configuração inválida -> usa padrão
  }
  return { phone: DEFAULT_ACTIVATION_PHONE, message: DEFAULT_ACTIVATION_MESSAGE };
};

export const saveActivationLinkConfig = (config: ActivationLinkConfig): void => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      phone: config.phone.trim(),
      message: config.message.trim(),
    })
  );
};
