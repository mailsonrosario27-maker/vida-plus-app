// Cliente do Assistente VIDA+. Usa a API da Anthropic quando ANTHROPIC_API_KEY
// está configurada; caso contrário, responde com orientações educativas fixas
// para que o app funcione (e seja demonstrável) sem uma chave real.
//
// O assistente NUNCA deve diagnosticar, prescrever medicamentos ou substituir
// acompanhamento profissional — isso é reforçado via system prompt e também
// nas respostas de fallback abaixo.

const SYSTEM_PROMPT = `Você é o Assistente VIDA+, parte de um aplicativo de hábitos saudáveis e emagrecimento consciente.

Regras obrigatórias:
- Use o perfil do usuário (objetivo, rotina, preferências, restrições) para personalizar respostas.
- NUNCA diagnostique doenças, prescreva medicamentos ou substitua nutricionista/médico.
- NUNCA incentive restrições alimentares extremas, jejuns prolongados além do combinado ou práticas perigosas.
- Quando o assunto exigir, oriente o usuário a procurar um profissional qualificado.
- Seja breve, acolhedor, prático e motivador — nunca culpabilize o usuário por dias imperfeitos.
- Prefira sugerir uma ação concreta e pequena (ex: um copo d'água agora, 10 minutos de caminhada) em vez de listas longas.`;

interface ChatContext {
  profile?: {
    name: string;
    goal: string;
    dietaryPreferences: string[];
    dietaryRestrictions: string[];
    activityLevel: string;
  } | null;
  history: { role: 'user' | 'assistant'; content: string }[];
  message: string;
}

function fallbackReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('fome') || lower.includes('comer') || lower.includes('lanche')) {
    return 'Que tal algo simples e nutritivo, como frutas com iogurte natural ou um punhado de castanhas? Dá uma olhada no "Meu Cardápio" para ver opções rápidas separadas por horário. (Assistente em modo offline — configure ANTHROPIC_API_KEY para respostas totalmente personalizadas.)';
  }
  if (lower.includes('treino') || lower.includes('exerc') || lower.includes('malh')) {
    return 'Sem tempo hoje não é o fim do mundo — 10 minutos de alongamento ou uma caminhada curta já contam. Veja as opções rápidas em "Movimente-se". (Assistente em modo offline.)';
  }
  if (lower.includes('água') || lower.includes('agua') || lower.includes('hidrat')) {
    return 'Bora recuperar? Beba um copo agora e ative os lembretes em Perfil > Notificações para não esquecer de novo. (Assistente em modo offline.)';
  }
  if (lower.includes('jejum')) {
    return 'Lembre-se: o jejum deve ser confortável, não uma prova de resistência. Se estiver difícil, está tudo bem encerrar mais cedo — o app registra normalmente. (Assistente em modo offline.)';
  }
  return 'Estou por aqui para ajudar a organizar sua alimentação, água, jejum e exercícios de hoje. Configure a chave da IA (ANTHROPIC_API_KEY) para respostas totalmente personalizadas ao seu perfil. (Assistente em modo offline.)';
}

export async function getAssistantReply(ctx: ChatContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackReply(ctx.message);
  }

  const profileLine = ctx.profile
    ? `Perfil do usuário: nome=${ctx.profile.name}, objetivo=${ctx.profile.goal}, nível de atividade=${ctx.profile.activityLevel}, preferências alimentares=${ctx.profile.dietaryPreferences.join(', ') || 'nenhuma'}, restrições=${ctx.profile.dietaryRestrictions.join(', ') || 'nenhuma'}.`
    : 'Perfil do usuário ainda não preenchido.';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 500,
        system: `${SYSTEM_PROMPT}\n\n${profileLine}`,
        messages: [
          ...ctx.history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: ctx.message },
        ],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error', res.status, await res.text());
      return fallbackReply(ctx.message);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === 'text')?.text;
    return text?.trim() || fallbackReply(ctx.message);
  } catch (err) {
    console.error('Falha ao chamar a IA:', err);
    return fallbackReply(ctx.message);
  }
}
