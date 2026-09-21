import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter, aiLimiter } from './middleware/rateLimiters';

import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import waterRoutes from './routes/water.routes';
import fastingRoutes from './routes/fasting.routes';
import recipesRoutes from './routes/recipes.routes';
import mealsRoutes from './routes/meals.routes';
import workoutsRoutes from './routes/workouts.routes';
import progressRoutes from './routes/progress.routes';
import achievementsRoutes from './routes/achievements.routes';
import aiRoutes from './routes/ai.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';

// Montagem do app Express separada da inicialização do servidor HTTP
// (src/server.ts) de propósito: os testes de integração importam `app` e
// batem nele direto via supertest, sem abrir uma porta de verdade.
export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Não logar corpo/headers inteiros — mantém logs enxutos e sem PII/segredos
    // além do que já é redigido em lib/logger.ts.
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

// Health checks separados: /health é o "estou de pé" simples (usado pelo
// Render para decidir se o serviço está saudável); /health/ready checa a
// dependência real (banco) — útil para saber se o problema é a aplicação
// ou o Postgres antes de sair investigando o lugar errado.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vida-plus-backend', time: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    logger.error({ err }, 'Health check falhou: banco indisponível');
    res.status(503).json({ status: 'unavailable', database: 'down' });
  }
});

app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/fasting', fastingRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use(errorHandler);
