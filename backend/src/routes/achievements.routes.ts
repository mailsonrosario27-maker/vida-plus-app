import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { currentStreak } from '../lib/gamification';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const [all, unlocked, points, streak] = await Promise.all([
      prisma.achievement.findMany(),
      prisma.userAchievement.findMany({ where: { userId } }),
      prisma.pointsLedgerEntry.aggregate({ where: { userId }, _sum: { points: true } }),
      currentStreak(userId),
    ]);
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
    const totalPoints = points._sum.points || 0;
    res.json({
      totalPoints,
      level: Math.floor(totalPoints / 100) + 1,
      streakDays: streak,
      achievements: all.map((a) => ({
        ...a,
        unlocked: unlockedIds.has(a.id),
        unlockedAt: unlocked.find((u) => u.achievementId === a.id)?.unlockedAt || null,
      })),
    });
  })
);

export default router;
