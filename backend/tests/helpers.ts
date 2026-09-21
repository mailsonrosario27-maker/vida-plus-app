import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

export { prisma };
export const api = request(app);

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${randomUUID()}@example.test`;
}

// Ordem não importa: TRUNCATE ... CASCADE remove os dados das tabelas que
// dependem via FK junto. Não usar em qualquer banco que não seja o de teste
// — a checagem de segurança em setup.ts existe justamente para isso.
export async function resetDb() {
  await prisma.$transaction([
    prisma.pointsLedgerEntry.deleteMany(),
    prisma.userAchievement.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.shoppingListItem.deleteMany(),
    prisma.favoriteRecipe.deleteMany(),
    prisma.mealLog.deleteMany(),
    prisma.workoutSession.deleteMany(),
    prisma.fastingSession.deleteMany(),
    prisma.waterLog.deleteMany(),
    prisma.progressEntry.deleteMany(),
    prisma.dailyPlanItem.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.workout.deleteMany(),
    prisma.achievement.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.appNotification.deleteMany(),
  ]);
}

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(overrides?: { email?: string; password?: string; name?: string }): Promise<TestUser> {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? 'senha123456';
  const name = overrides?.name ?? 'Usuária de Teste';

  const res = await api.post('/api/auth/register').send({ email, password, name });
  if (res.status !== 201) {
    throw new Error(`Falha ao registrar usuário de teste: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.user.id, email, accessToken: res.body.accessToken, refreshToken: res.body.refreshToken };
}

// O access token já emitido carrega o role antigo (JWT é stateless) — depois
// de promover no banco, é preciso logar de novo para pegar um token com o
// claim `role: ADMIN` atualizado.
export async function createWorkout() {
  return prisma.workout.create({
    data: {
      title: 'Treino de teste',
      level: 'BEGINNER',
      category: 'HOME',
      durationMin: 10,
      description: 'Treino usado só nos testes automatizados.',
      items: [{ name: 'Agachamento', reps: 10 }],
    },
  });
}

export async function registerAdmin(overrides?: { email?: string; password?: string; name?: string }): Promise<TestUser> {
  const password = overrides?.password ?? 'senha123456';
  const user = await registerUser({ ...overrides, password });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  const res = await api.post('/api/auth/login').send({ email: user.email, password });
  return { id: user.id, email: user.email, accessToken: res.body.accessToken, refreshToken: res.body.refreshToken };
}
