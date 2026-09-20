import { logger } from './logger';

// Camada isolada de envio de e-mail — o resto do app nunca fala com um
// provedor de e-mail diretamente. Sem RESEND_API_KEY configurada, cai num
// modo de desenvolvimento que só loga o conteúdo (nunca falha silenciosamente
// fingindo que enviou, e nunca expõe o token de reset numa resposta HTTP).
interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

async function sendViaResend(input: SendEmailInput): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'VIDA+ <onboarding@resend.dev>',
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao enviar e-mail via Resend (${res.status}): ${body}`);
  }
}

async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn(
      { to: input.to, subject: input.subject },
      'RESEND_API_KEY não configurada — e-mail não enviado de verdade, apenas registrado (modo dev)'
    );
    return;
  }
  await sendViaResend(input);
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  // Sem app publicado ainda, o link é informativo — quando o deep link do
  // app estiver registrado nas lojas, trocar por algo como
  // vidaplus://reset-password?token=... ou uma página web dedicada.
  const html = `
    <p>Você pediu para redefinir sua senha no VIDA+.</p>
    <p>Use este código no app para criar uma nova senha (válido por 1 hora):</p>
    <p style="font-size:20px;font-weight:700;letter-spacing:2px;">${resetToken}</p>
    <p>Se você não pediu isso, pode ignorar este e-mail com segurança.</p>
  `;

  // Só em não-produção: sem provedor real configurado, o token só existiria
  // dentro do e-mail nunca enviado — sem isso não daria pra testar o fluxo
  // de reset localmente. Nunca cai aqui em produção mesmo que
  // RESEND_API_KEY seja esquecida, porque o guard olha NODE_ENV, não a chave.
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    logger.warn({ to, resetToken }, '[modo dev] token de redefinição de senha (não enviado por e-mail de verdade)');
  }

  await sendEmail({ to, subject: 'Redefinir sua senha — VIDA+', html });
}
