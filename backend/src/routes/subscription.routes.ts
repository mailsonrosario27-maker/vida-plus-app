import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.auth!.userId } });
    res.json(sub);
  })
);

// Ponto único de integração com RevenueCat/App Store/Google Play. Hoje a
// confirmação de compra é feita manualmente (plano PREMIUM ativado direto);
// em produção, troque este handler pelo webhook do provedor de compras.
const subscribeSchema = z.object({
  provider: z.enum(['MANUAL', 'APPLE', 'GOOGLE']).default('MANUAL'),
  trialDays: z.number().int().min(0).max(30).optional(),
});

router.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const { provider, trialDays } = subscribeSchema.parse(req.body);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const trialEndsAt = trialDays ? new Date(now.getTime() + trialDays * 86400000) : null;

    const sub = await prisma.subscription.update({
      where: { userId: req.auth!.userId },
      data: {
        plan: 'PREMIUM',
        status: trialDays ? 'TRIALING' : 'ACTIVE',
        provider,
        trialEndsAt,
        currentPeriodEnd: periodEnd,
      },
    });
    res.json(sub);
  })
);

router.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.update({
      where: { userId: req.auth!.userId },
      data: { status: 'CANCELLED' },
    });
    res.json(sub);
  })
);

export default router;
