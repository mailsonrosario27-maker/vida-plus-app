import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth, AuthPayload } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiters';
import { generateOpaqueToken, hashToken } from '../lib/tokens';
import { sendPasswordResetEmail } from '../lib/email';
import { logger } from '../lib/logger';

const router = Router();

const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30;
const RESET_TOKEN_MINUTES = 60;

async function issueTokenPair(user: { id: string; role: AuthPayload['role'] }, userAgent?: string) {
  const accessToken = signToken({ userId: user.id, role: user.role });
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt, userAgent: userAgent?.slice(0, 255) },
  });
  return { accessToken, refreshToken };
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.'),
  name: z.string().min(1),
});

router.post(
  '/register',
  authLimiter,
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

    const tokens = await issueTokenPair(user, req.headers['user-agent']);
    res.status(201).json({ ...tokens, user: { id: user.id, email: user.email, name: user.profile?.name } });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    const tokens = await issueTokenPair(user, req.headers['user-agent']);
    res.json({ ...tokens, user: { id: user.id, email: user.email, name: user.profile?.name, role: user.role } });
  })
);

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

router.post(
  '/refresh',
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    // Rotação: o refresh token usado é imediatamente revogado e substituído.
    // Se alguém reusar um refresh token antigo depois disso, é sinal de
    // roubo de token — revogamos a família inteira por segurança.
    const newTokens = await issueTokenPair(user, req.headers['user-agent']);
    const newTokenHash = hashToken(newTokens.refreshToken);
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newTokenHash },
    });

    res.json(newTokens);
  })
);

const logoutSchema = z.object({ refreshToken: z.string().min(1) });

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = logoutSchema.parse(req.body);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.status(204).send();
  })
);

router.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.auth!.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    res.json(sessions);
  })
);

router.delete(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.refreshToken.updateMany({
      where: { id: req.params.id, userId: req.auth!.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.status(204).send();
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
    // LGPD: exclusão de conta e dados pessoais associados (cascade no schema
    // também revoga refresh tokens e reset tokens automaticamente).
    await prisma.user.delete({ where: { id: user.id } });
    res.status(204).send();
  })
);

const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Sempre responde igual, exista ou não a conta — não dá pra um atacante
    // descobrir quais e-mails têm cadastro testando esse endpoint.
    if (user) {
      const rawToken = generateOpaqueToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
        },
      });
      sendPasswordResetEmail(user.email, rawToken).catch((err) =>
        logger.error({ err, userId: user.id }, 'Falha ao enviar e-mail de redefinição de senha')
      );
    }

    res.json({ message: 'Se este e-mail estiver cadastrado, você vai receber instruções para redefinir sua senha.' });
  })
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.'),
});

router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      // Trocar a senha derruba todas as sessões existentes — se foi um
      // invasor que pediu o reset por engano, ele não fica logado em lugar
      // nenhum; se foi o próprio usuário, ele só precisa logar de novo.
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Senha redefinida com sucesso. Faça login novamente.' });
  })
);

export default router;
