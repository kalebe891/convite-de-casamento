// Lightweight HTML templates — no heavy images, short subjects, anti-spam friendly

export function inviteAdminTemplate(params: {
  nome: string;
  roleLabel: string;
  invitationLink: string;
}): { subject: string; html: string } {
  const { nome, roleLabel, invitationLink } = params;

  return {
    subject: "Convite: Painel Administrativo",
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#333;">
  <h2 style="color:#4F46E5;margin-bottom:8px;">Você foi convidado!</h2>
  <p>Olá, ${nome}!</p>
  <p>Você foi convidado para acessar o painel administrativo do casamento.</p>
  <p>Seu papel: <strong>${roleLabel}</strong></p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${invitationLink}"
       style="background-color:#4F46E5;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
      Criar Senha e Acessar
    </a>
  </div>
  <p style="color:#666;font-size:13px;">Ou copie o link:<br/>
    <span style="word-break:break-all;color:#4F46E5;font-size:12px;">${invitationLink}</span>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
  <p style="color:#999;font-size:11px;">Este link expira em 48 horas.</p>
</div>`,
  };
}

export function rsvpInviteTemplate(params: {
  guestName: string;
  invitationLink: string;
}): { subject: string; html: string } {
  const { guestName, invitationLink } = params;

  return {
    subject: "Você está convidado! ❤️",
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#333;">
  <h1 style="text-align:center;color:#333;">Você está convidado!</h1>
  <p style="text-align:center;font-size:16px;color:#666;">
    Olá, ${guestName}! ❤️
  </p>
  <p style="text-align:center;font-size:16px;color:#666;">
    Estamos muito felizes em convidá-lo(a) para celebrar conosco este momento tão especial!
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${invitationLink}"
       style="background-color:#8B5CF6;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-size:16px;display:inline-block;">
      Confirmar Presença
    </a>
  </div>
  <p style="text-align:center;font-size:13px;color:#999;">
    Ou copie o link:<br/>
    <span style="color:#666;font-size:12px;">${invitationLink}</span>
  </p>
</div>`,
  };
}

export function testEmailTemplate(): { subject: string; html: string } {
  return {
    subject: "Teste de Email",
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#333;">
  <h2 style="color:#4F46E5;">Email de Teste</h2>
  <p>Este é um email de teste enviado via MailerSend.</p>
  <p>Se você está lendo isso, a integração está funcionando corretamente! ✅</p>
  <p style="color:#999;font-size:12px;">Enviado em: ${new Date().toISOString()}</p>
</div>`,
  };
}
