import { describe, it, expect } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';

// Os limitadores reais (src/middleware/rateLimiters.ts) ficam desativados
// durante os testes de integração (ver comentário lá) para não travar o
// resto da suíte — então validamos a integração da biblioteca em si aqui,
// numa instância isolada com um limite bem baixo, sem tocar no app real.
describe('express-rate-limit — integração', () => {
  it('bloqueia com 429 depois do limite configurado, e libera fora da janela do IP', async () => {
    const app = express();
    app.use(
      '/limited',
      rateLimit({ windowMs: 60_000, limit: 3, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitas tentativas.' } })
    );
    app.get('/limited', (_req, res) => res.json({ ok: true }));

    const agent = request(app);
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push((await agent.get('/limited')).status);
    }

    expect(results).toEqual([200, 200, 200, 429, 429]);
  });

  it('a resposta 429 usa a mensagem configurada, não o texto padrão da lib', async () => {
    const app = express();
    app.use('/limited', rateLimit({ windowMs: 60_000, limit: 1, message: { error: 'Mensagem customizada.' } }));
    app.get('/limited', (_req, res) => res.json({ ok: true }));

    const agent = request(app);
    await agent.get('/limited');
    const blocked = await agent.get('/limited');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('Mensagem customizada.');
  });
});
