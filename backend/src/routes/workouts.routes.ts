import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { awardPoints, checkAndUnlockAchievements, POINTS } from '../lib/gamification';

const router = Router();

const listQuerySchema = z.object({
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  category: z.enum(['WALK', 'RUN', 'BIKE', 'HOME', 'MOBILITY', 'STRETCH', 'STRENGTH']).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { level, category } = listQuerySchema.parse(req.query);
    const workouts = await prisma.workout.findMany({
      where: {
        ...(level ? { level } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(workouts);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workout = await prisma.workout.findUnique({ where: { id: req.params.id } });
    if (!workout) return res.status(404).json({ error: 'Treino não encontrado.' });
    res.json(workout);
  })
);

router.use(requireAuth);

router.post(
  '/:id/start',
  asyncHandler(async (req, res) => {
    const session = await prisma.workoutSession.create({
      data: { userId: req.auth!.userId, workoutId: req.params.id },
    });
    res.status(201).json(session);
  })
);

const completeSchema = z.object({ durationMin: z.number().int().positive().optional() });

router.post(
  '/sessions/:sessionId/complete',
  asyncHandler(async (req, res) => {
    const { durationMin } = completeSchema.parse(req.body);
    const result = await prisma.workoutSession.updateMany({
      where: { id: req.params.sessionId, userId: req.auth!.userId, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', completedAt: new Date(), durationMin },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou já concluída.' });
    }
    const session = await prisma.workoutSession.findUnique({ where: { id: req.params.sessionId } });
    await awardPoints(req.auth!.userId, POINTS.WORKOUT_COMPLETE, 'Treino concluído');
    const unlocked = await checkAndUnlockAchievements(req.auth!.userId);
    res.json({ session, unlockedAchievements: unlocked });
  })
);

router.post(
  '/sessions/:sessionId/cancel',
  asyncHandler(async (req, res) => {
    const result = await prisma.workoutSession.updateMany({
      where: { id: req.params.sessionId, userId: req.auth!.userId, status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED' },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou já concluída.' });
    }
    const session = await prisma.workoutSession.findUnique({ where: { id: req.params.sessionId } });
    res.json(session);
  })
);

router.get(
  '/me/history',
  asyncHandler(async (req, res) => {
    const sessions = await prisma.workoutSession.findMany({
      where: { userId: req.auth!.userId, status: 'COMPLETED' },
      include: { workout: true },
      orderBy: { completedAt: 'desc' },
      take: 30,
    });
    res.json(sessions);
  })
);

export default router;
