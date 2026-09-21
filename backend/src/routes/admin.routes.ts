import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { daysAgoUTC } from '../lib/dateBoundaries';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    const since30 = daysAgoUTC(30);

    const [totalUsers, premiumUsers, activeUsers30d, recipesCount, workoutsCount, mostFavorited] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.subscription.count({ where: { plan: 'PREMIUM', status: { in: ['ACTIVE', 'TRIALING'] } } }),
      prisma.user.count({
        where: {
          role: 'USER',
          OR: [
            { waterLogs: { some: { loggedAt: { gte: since30 } } } },
            { mealLogs: { some: { loggedAt: { gte: since30 } } } },
            { workoutSessions: { some: { startedAt: { gte: since30 } } } },
          ],
        },
      }),
      prisma.recipe.count(),
      prisma.workout.count(),
      prisma.recipe.findMany({
        orderBy: { favoritedBy: { _count: 'desc' } },
        take: 5,
        select: { id: true, title: true, _count: { select: { favoritedBy: true } } },
      }),
    ]);

    res.json({
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      conversionPercent: totalUsers ? Math.round((premiumUsers / totalUsers) * 100) : 0,
      activeUsers30d,
      retentionPercent: totalUsers ? Math.round((activeUsers30d / totalUsers) * 100) : 0,
      recipesCount,
      workoutsCount,
      mostFavoritedContent: mostFavorited,
    });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      include: { profile: true, subscription: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.profile?.name,
        goal: u.profile?.goal,
        plan: u.subscription?.plan,
        status: u.subscription?.status,
        createdAt: u.createdAt,
      }))
    );
  })
);

// --- Receitas ---
const recipeSchema = z.object({
  title: z.string(),
  category: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'DRINK', 'TEA']),
  period: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'ANY']).default('ANY'),
  description: z.string(),
  imageUrl: z.string().optional(),
  ingredients: z.array(z.object({ name: z.string().trim().min(1), quantity: z.string().optional() })).min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  prepTimeMin: z.number().int().positive(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  calories: z.number().int().optional(),
  proteinG: z.number().optional(),
  carbsG: z.number().optional(),
  fatG: z.number().optional(),
  tags: z.array(z.string()).default([]),
  bestTime: z.string().optional(),
  cautions: z.string().optional(),
});

router.post(
  '/recipes',
  asyncHandler(async (req, res) => {
    const data = recipeSchema.parse(req.body);
    const recipe = await prisma.recipe.create({ data });
    res.status(201).json(recipe);
  })
);

router.put(
  '/recipes/:id',
  asyncHandler(async (req, res) => {
    const data = recipeSchema.partial().parse(req.body);
    const recipe = await prisma.recipe.update({ where: { id: req.params.id }, data });
    res.json(recipe);
  })
);

router.delete(
  '/recipes/:id',
  asyncHandler(async (req, res) => {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// --- Treinos ---
const workoutSchema = z.object({
  title: z.string(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  category: z.enum(['WALK', 'RUN', 'BIKE', 'HOME', 'MOBILITY', 'STRETCH', 'STRENGTH']),
  durationMin: z.number().int().positive(),
  description: z.string(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        durationSec: z.number().int().optional(),
        reps: z.number().int().optional(),
        restSec: z.number().int().optional(),
        instructions: z.string().optional(),
      })
    )
    .min(1),
});

router.post(
  '/workouts',
  asyncHandler(async (req, res) => {
    const data = workoutSchema.parse(req.body);
    const workout = await prisma.workout.create({ data });
    res.status(201).json(workout);
  })
);

router.put(
  '/workouts/:id',
  asyncHandler(async (req, res) => {
    const data = workoutSchema.partial().parse(req.body);
    const workout = await prisma.workout.update({ where: { id: req.params.id }, data });
    res.json(workout);
  })
);

router.delete(
  '/workouts/:id',
  asyncHandler(async (req, res) => {
    await prisma.workout.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// --- Banners ---
const bannerSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
  active: z.boolean().default(true),
});

router.get(
  '/banners',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.banner.findMany({ orderBy: { createdAt: 'desc' } }));
  })
);

router.post(
  '/banners',
  asyncHandler(async (req, res) => {
    const data = bannerSchema.parse(req.body);
    res.status(201).json(await prisma.banner.create({ data }));
  })
);

router.patch(
  '/banners/:id',
  asyncHandler(async (req, res) => {
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    const result = await prisma.banner.updateMany({ where: { id: req.params.id }, data: { active } });
    if (result.count === 0) return res.status(404).json({ error: 'Banner não encontrado.' });
    res.json(await prisma.banner.findUnique({ where: { id: req.params.id } }));
  })
);

router.delete(
  '/banners/:id',
  asyncHandler(async (req, res) => {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// --- Notificações administrativas ---
const notificationSchema = z.object({
  title: z.string(),
  body: z.string(),
  audience: z.enum(['all', 'premium', 'free']).default('all'),
});

router.get(
  '/notifications',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.appNotification.findMany({ orderBy: { createdAt: 'desc' } }));
  })
);

router.post(
  '/notifications',
  asyncHandler(async (req, res) => {
    const data = notificationSchema.parse(req.body);
    // Em produção, isto dispararia o envio via Expo Push / FCM / APNs.
    const notification = await prisma.appNotification.create({ data: { ...data, sentAt: new Date() } });
    res.status(201).json(notification);
  })
);

export default router;
