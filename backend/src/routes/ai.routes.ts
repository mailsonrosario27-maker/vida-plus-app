import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getAssistantReply } from '../lib/ai';

const router = Router();
router.use(requireAuth);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json(messages);
  })
);

const chatSchema = z.object({ message: z.string().min(1).max(2000) });

router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { message } = chatSchema.parse(req.body);
    const userId = req.auth!.userId;

    const [profile, history] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    await prisma.chatMessage.create({ data: { userId, role: 'USER', content: message } });

    const reply = await getAssistantReply({
      message,
      profile: profile
        ? {
            name: profile.name,
            goal: profile.goal,
            dietaryPreferences: profile.dietaryPreferences,
            dietaryRestrictions: profile.dietaryRestrictions,
            activityLevel: profile.activityLevel,
          }
        : null,
      history: history.reverse().map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content })),
    });

    const saved = await prisma.chatMessage.create({ data: { userId, role: 'ASSISTANT', content: reply } });
    res.status(201).json(saved);
  })
);

export default router;
