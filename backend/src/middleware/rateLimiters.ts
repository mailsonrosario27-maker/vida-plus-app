import rateLimit from 'express-rate-limit';

// Em teste automatizado, a suíte inteira chama /register e /login dezenas
// de vezes em segundos — isso esgotaria o limite real e quebraria testes
// sem relação nenhuma com força bruta. A lógica do limitador em si é
// validada isoladamente em tests/rateLimiter.unit.test.ts, com sua própria
// instância de limite baixo — não precisa (e não deve) estar ativa aqui.
const skipInTest = () => process.env.NODE_ENV === 'test';

// Login/registro/reset de senha: alvo clássico de força bruta e enumeração
// de e-mail. Limite rígido por IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// /auth/refresh precisa de um limite separado e bem mais generoso: ele NÃO
// é alvo de força bruta (exige já possuir um refresh token de 32 bytes
// impossível de adivinhar) e acontece automaticamente em segundo plano a
// cada ~15 min para qualquer usuário logado — compartilhar o limite do
// login derrubaria sessões legítimas de uso prolongado.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// IA tem custo real por chamada — limite por usuário autenticado (cai no IP
// como fallback se por algum motivo não houver usuário no request).
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => req.auth?.userId || req.ip || 'unknown',
  message: { error: 'Muitas mensagens em pouco tempo. Aguarde um instante.' },
});

// Limite geral e generoso para o resto da API autenticada — não é a defesa
// principal (isso é a autenticação em si), é só um teto contra abuso/bug de
// loop no cliente.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Muitas requisições. Aguarde um instante.' },
});
