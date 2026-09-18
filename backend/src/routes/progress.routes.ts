import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { currentStreak } from '../lib/gamification';
import { getTodayPlan } from '../lib/dailyPlan';

const router = Router();
router.use(requireAuth);

router.get(
  '/plan/today',
  asyncHandler(async (req, res) => {
    const plan = await getTodayPlan(req.auth!.userId);
    const completion = plan.length ? Math.round((plan.filter((p) => p.done).length / plan.length) * 100) : 0;
    res.json({ plan, completionPercent: completion });
  })
);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [profile, waterLogs, mealLogs, workoutSessions, fastingSession, points, streak] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: startOfDay } } }),
      prisma.mealLog.count({ where: { userId, loggedAt: { gte: startOfDay } } }),
      prisma.workoutSession.aggregate({
        where: { userId, status: 'COMPLETED', completedAt: { gte: startOfDay } },
        _sum: { durationMin: true },
      }),
      prisma.fastingSession.findFirst({ where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } } }),
      prisma.pointsLedgerEntry.aggregate({ where: { userId }, _sum: { points: true } }),
      currentStreak(userId),
    ]);

    const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0);
    const waterGoal = profile?.waterGoalMl || 2000;
    const exerciseMin = workoutSessions._sum.durationMin || 0;
    const exerciseGoalMin = 30;
    const mealsGoal = 4;

    let fastingProgress = 0;
    if (fastingSession) {
      const elapsedMs =
        Date.now() - fastingSession.startedAt.getTime() - fastingSession.pausedTotalMs;
      fastingProgress = Math.min(1, elapsedMs / (fastingSession.plannedDurationMin * 60 * 1000));
    }

    const categories = [
      { key: 'water', progress: Math.min(1, waterTotal / waterGoal) },
      { key: 'meals', progress: Math.min(1, mealLogs / mealsGoal) },
      { key: 'fasting', progress: fastingProgress },
      { key: 'exercise', progress: Math.min(1, exerciseMin / exerciseGoalMin) },
    ];
    const overallPercent = Math.round(
      (categories.reduce((s, c) => s + c.progress, 0) / categories.length) * 100
    );

    res.json({
      water: { totalMl: waterTotal, goalMl: waterGoal },
      meals: { count: mealLogs, goal: mealsGoal },
      exercise: { minutes: exerciseMin, goalMinutes: exerciseGoalMin },
      fasting: fastingSession
        ? { active: true, startedAt: fastingSession.startedAt, plannedDurationMin: fastingSession.plannedDurationMin }
        : { active: false },
      overallPercent,
      totalPoints: points._sum.points || 0,
      streakDays: streak,
    });
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const entries = await prisma.progressEntry.findMany({
      where: { userId: req.auth!.userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
    res.json(entries);
  })
);

const entrySchema = z.object({
  weightKg: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.post(
  '/entries',
  asyncHandler(async (req, res) => {
    const data = entrySchema.parse(req.body);
    const entry = await prisma.progressEntry.create({ data: { ...data, userId: req.auth!.userId } });
    if (data.weightKg) {
      await prisma.profile.update({ where: { userId: req.auth!.userId }, data: { weightKg: data.weightKg } });
    }
    res.status(201).json(entry);
  })
);

router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const days = Number(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [waterLogs, mealLogs, workouts, fasts] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: since } }, select: { loggedAt: true } }),
      prisma.mealLog.findMany({ where: { userId, loggedAt: { gte: since } }, select: { loggedAt: true } }),
      prisma.workoutSession.findMany({
        where: { userId, status: 'COMPLETED', completedAt: { gte: since } },
        select: { completedAt: true },
      }),
      prisma.fastingSession.findMany({
        where: { userId, status: 'COMPLETED', endedAt: { gte: since } },
        select: { endedAt: true },
      }),
    ]);

    const activityCount = new Map<string, number>();
    const bump = (d: Date | null) => {
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      activityCount.set(key, (activityCount.get(key) || 0) + 1);
    };
    waterLogs.forEach((l) => bump(l.loggedAt));
    mealLogs.forEach((l) => bump(l.loggedAt));
    workouts.forEach((l) => bump(l.completedAt));
    fasts.forEach((l) => bump(l.endedAt));

    const calendar = Array.from(activityCount.entries()).map(([date, count]) => ({
      date,
      status: count >= 3 ? 'COMPLETE' : count >= 1 ? 'PARTIAL' : 'EMPTY',
    }));
    res.json(calendar);
  })
);

export default router;
