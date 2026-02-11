const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;

export interface EmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  text?: string;
  from?: { email: string; name: string };
  headers?: Record<string, string>;
}

interface MailerSendResponse {
  success: boolean;
  messageId: string | null;
  status: number;
  error?: string;
}

function getApiToken(): string {
  const token = Deno.env.get("MAILERSEND_API_TOKEN");
  if (!token) {
    throw new Error("MAILERSEND_API_TOKEN not configured");
  }
  return token;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTransactionalEmail(
  payload: EmailPayload
): Promise<MailerSendResponse> {
  const token = getApiToken();
  const { to, subject, html, from } = payload;
  const text = payload.text || stripHtmlToText(html);

  const tenantConfig = getTenantEmailConfig();
  const sender = from || { email: tenantConfig.fromEmail, name: tenantConfig.fromName };

  const body = JSON.stringify({
    from: sender,
    to,
    subject,
    html,
    text,
  });

  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  };

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await sendWithTimeout(
        MAILERSEND_API_URL,
        requestOptions,
        REQUEST_TIMEOUT_MS
      );

      const messageId = response.headers.get("x-message-id") || null;

      if (response.status === 202 || response.status === 200) {
        // Consume body
        await response.text();

        console.log(
          JSON.stringify({
            event: "EMAIL_SENT",
            to: to.map((r) => r.email),
            subject,
            messageId,
            status: response.status,
            attempt: attempt + 1,
          })
        );

        return { success: true, messageId, status: response.status };
      }

      const errorBody = await response.text();
      lastError = `Status ${response.status}: ${errorBody}`;

      console.error(
        JSON.stringify({
          event: "EMAIL_FAILED",
          to: to.map((r) => r.email),
          subject,
          status: response.status,
          error: lastError,
          attempt: attempt + 1,
          willRetry: attempt < MAX_RETRIES && response.status >= 500,
        })
      );

      // Only retry on 5xx
      if (response.status < 500 || attempt >= MAX_RETRIES) {
        return { success: false, messageId, status: response.status, error: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);

      console.error(
        JSON.stringify({
          event: "EMAIL_FAILED",
          to: to.map((r) => r.email),
          subject,
          error: lastError,
          attempt: attempt + 1,
          willRetry: attempt < MAX_RETRIES,
        })
      );

      if (attempt >= MAX_RETRIES) {
        return { success: false, messageId: null, status: 0, error: lastError };
      }
    }
  }

  return { success: false, messageId: null, status: 0, error: lastError };
}

// --- Tenant config (multi-tenant ready) ---

interface TenantEmailConfig {
  fromEmail: string;
  fromName: string;
  domain: string;
}

export function getTenantEmailConfig(_tenantId?: string): TenantEmailConfig {
  // Today: fixed values. Future: lookup by tenantId.
  return {
    fromEmail: "noreply@trial-3vz9dlezpvplkj50.mlsender.net",
    fromName: "Beatriz & Diogo",
    domain: "trial-3vz9dlezpvplkj50.mlsender.net",
  };
}
