import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { awardPoints, checkAndUnlockAchievements, POINTS } from '../lib/gamification';

const router = Router();
router.use(requireAuth);

router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const logs = await prisma.mealLog.findMany({
      where: { userId: req.auth!.userId, loggedAt: { gte: startOfDay } },
      include: { recipe: true },
      orderBy: { loggedAt: 'asc' },
    });
    res.json(logs);
  })
);

const addSchema = z.object({
  recipeId: z.string().optional(),
  customName: z.string().optional(),
  period: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'ANY']).default('ANY'),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = addSchema.parse(req.body);
    if (!data.recipeId && !data.customName) {
      return res.status(400).json({ error: 'Informe recipeId ou customName.' });
    }
    const log = await prisma.mealLog.create({ data: { ...data, userId: req.auth!.userId } });
    await awardPoints(req.auth!.userId, POINTS.MEAL_LOG, 'Refeição registrada');
    const unlocked = await checkAndUnlockAchievements(req.auth!.userId);
    res.status(201).json({ log, unlockedAchievements: unlocked });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.mealLog.deleteMany({ where: { id: req.params.id, userId: req.auth!.userId } });
    res.status(204).send();
  })
);

export default router;
