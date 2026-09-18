import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

const onboardingSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive().optional(),
  sex: z.string().optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  goal: z.enum(['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE', 'HEALTHY_HABITS']).optional(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).optional(),
  wakeTime: z.string().optional(),
  sleepTime: z.string().optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  exerciseExperience: z.enum(['NONE', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  fastingExperience: z.enum(['NONE', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  waterGoalMl: z.number().int().positive().optional(),
  darkMode: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { userId: req.auth!.userId } });
    res.json(profile);
  })
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const data = onboardingSchema.partial().parse(req.body);
    const profile = await prisma.profile.update({ where: { userId: req.auth!.userId }, data });
    res.json(profile);
  })
);

router.post(
  '/complete-onboarding',
  asyncHandler(async (req, res) => {
    const data = onboardingSchema.parse(req.body);
    const profile = await prisma.profile.update({
      where: { userId: req.auth!.userId },
      data: { ...data, onboardingCompleted: true },
    });
    res.json(profile);
  })
);

const notificationSchema = z.object({
  waterReminders: z.boolean().optional(),
  waterStartTime: z.string().optional(),
  waterEndTime: z.string().optional(),
  waterFrequencyMin: z.number().int().positive().optional(),
  mealReminders: z.boolean().optional(),
  exerciseReminders: z.boolean().optional(),
  fastingReminders: z.boolean().optional(),
  windDownReminders: z.boolean().optional(),
});

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.auth!.userId } });
    res.json(prefs);
  })
);

router.put(
  '/notifications',
  asyncHandler(async (req, res) => {
    const data = notificationSchema.parse(req.body);
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.auth!.userId },
      create: { userId: req.auth!.userId, ...data },
      update: data,
    });
    res.json(prefs);
  })
);

export default router;
