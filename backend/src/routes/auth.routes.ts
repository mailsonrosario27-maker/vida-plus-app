import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.'),
  name: z.string().min(1),
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { name } },
        subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        notificationPrefs: { create: {} },
      },
      include: { profile: true },
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.profile?.name } });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.profile?.name, role: user.role } });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true, subscription: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      subscription: user.subscription,
    });
  })
);

const deleteSchema = z.object({ password: z.string().min(1) });

router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = deleteSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
    // LGPD: exclusão de conta e dados pessoais associados (cascade no schema).
    await prisma.user.delete({ where: { id: user.id } });
    res.status(204).send();
  })
);

export default router;
