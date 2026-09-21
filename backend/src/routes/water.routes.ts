import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { awardPoints, checkAndUnlockAchievements, POINTS } from '../lib/gamification';
import { startOfTodayInTz, daysAgoInTz, dateKeyInTz, resolveUserTimezone, DEFAULT_TIMEZONE } from '../lib/dateBoundaries';

const router = Router();
router.use(requireAuth);

router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { userId: req.auth!.userId } });
    const timeZone = profile?.timezone || DEFAULT_TIMEZONE;
    const logs = await prisma.waterLog.findMany({
      where: { userId: req.auth!.userId, loggedAt: { gte: startOfTodayInTz(timeZone) } },
      orderBy: { loggedAt: 'asc' },
    });
    const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
    res.json({ totalMl, goalMl: profile?.waterGoalMl || 2000, logs });
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 7;
    const timeZone = await resolveUserTimezone(req.auth!.userId);
    const logs = await prisma.waterLog.findMany({
      where: { userId: req.auth!.userId, loggedAt: { gte: daysAgoInTz(days, timeZone) } },
      orderBy: { loggedAt: 'asc' },
    });
    const byDay = new Map<string, number>();
    for (const log of logs) {
      const day = dateKeyInTz(log.loggedAt, timeZone);
      byDay.set(day, (byDay.get(day) || 0) + log.amountMl);
    }
    res.json(Array.from(byDay.entries()).map(([date, totalMl]) => ({ date, totalMl })));
  })
);

const addSchema = z.object({ amountMl: z.number().int().positive().max(5000) });

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { amountMl } = addSchema.parse(req.body);
    const log = await prisma.waterLog.create({ data: { userId: req.auth!.userId, amountMl } });
    await awardPoints(req.auth!.userId, POINTS.WATER_LOG, 'Registro de água');
    const unlocked = await checkAndUnlockAchievements(req.auth!.userId);
    res.status(201).json({ log, unlockedAchievements: unlocked });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.waterLog.deleteMany({ where: { id: req.params.id, userId: req.auth!.userId } });
    res.status(204).send();
  })
);

export default router;
