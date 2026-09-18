import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { awardPoints, checkAndUnlockAchievements, POINTS } from '../lib/gamification';

const router = Router();
router.use(requireAuth);

router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const session = await prisma.fastingSession.findFirst({
      where: { userId: req.auth!.userId, status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
    });
    res.json(session);
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const sessions = await prisma.fastingSession.findMany({
      where: { userId: req.auth!.userId, status: { in: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { startedAt: 'desc' },
      take: 30,
    });
    res.json(sessions);
  })
);

const startSchema = z.object({
  protocol: z.string().default('16:8'),
  plannedDurationMin: z.number().int().positive().default(960),
});

router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const existing = await prisma.fastingSession.findFirst({
      where: { userId: req.auth!.userId, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Já existe um jejum em andamento.' });
    }
    const { protocol, plannedDurationMin } = startSchema.parse(req.body);
    const session = await prisma.fastingSession.create({
      data: { userId: req.auth!.userId, protocol, plannedDurationMin },
    });
    res.status(201).json(session);
  })
);

router.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const result = await prisma.fastingSession.updateMany({
      where: { id: req.params.id, userId: req.auth!.userId, status: 'ACTIVE' },
      data: { status: 'PAUSED', lastPausedAt: new Date() },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou não pode ser pausada.' });
    }
    const session = await prisma.fastingSession.findUnique({ where: { id: req.params.id } });
    res.json(session);
  })
);

router.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const session = await prisma.$transaction(
      async (tx) => {
        const current = await tx.fastingSession.findFirst({
          where: { id: req.params.id, userId: req.auth!.userId, status: 'PAUSED' },
        });
        if (!current) return null;
        const pausedMs = current.lastPausedAt ? Date.now() - current.lastPausedAt.getTime() : 0;
        return tx.fastingSession.update({
          where: { id: current.id },
          data: {
            status: 'ACTIVE',
            lastPausedAt: null,
            pausedTotalMs: current.pausedTotalMs + pausedMs,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada ou não está pausada.' });
    }
    res.json(session);
  })
);

router.post(
  '/:id/end',
  asyncHandler(async (req, res) => {
    const result = await prisma.fastingSession.updateMany({
      where: { id: req.params.id, userId: req.auth!.userId, status: { in: ['ACTIVE', 'PAUSED'] } },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou já encerrada.' });
    }
    const session = await prisma.fastingSession.findUnique({ where: { id: req.params.id } });
    await awardPoints(req.auth!.userId, POINTS.FASTING_COMPLETE, 'Jejum concluído');
    const unlocked = await checkAndUnlockAchievements(req.auth!.userId);
    res.json({ session, unlockedAchievements: unlocked });
  })
);

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const result = await prisma.fastingSession.updateMany({
      where: { id: req.params.id, userId: req.auth!.userId, status: { in: ['ACTIVE', 'PAUSED'] } },
      data: { status: 'CANCELLED', endedAt: new Date() },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou já encerrada.' });
    }
    const session = await prisma.fastingSession.findUnique({ where: { id: req.params.id } });
    res.json(session);
  })
);

export default router;
