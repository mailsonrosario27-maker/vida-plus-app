import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, registerUser, prisma } from './helpers';

describe('Gamificação', () => {
  beforeAll(resetDb);

  it('não desbloqueia nenhuma conquista pra usuário recém-criado sem atividade', async () => {
    const user = await registerUser();
    const res = await api.get('/api/achievements').set('Authorization', `Bearer ${user.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalPoints).toBe(0);
    expect(res.body.streakDays).toBe(0);
    expect(res.body.achievements.every((a: { unlocked: boolean }) => !a.unlocked)).toBe(true);
  });

  it('desbloqueia "primeiro dia" e soma pontos ao registrar água', async () => {
    const user = await registerUser();
    await prisma.achievement.upsert({
      where: { code: 'first_day' },
      create: { code: 'first_day', title: 'Primeiro dia', description: '', icon: '🏆', criteriaType: 'first_day', criteriaValue: 1 },
      update: {},
    });

    const log = await api.post('/api/water').set('Authorization', `Bearer ${user.accessToken}`).send({ amountMl: 250 });
    expect(log.status).toBe(201);
    expect(log.body.unlockedAchievements).toContain('Primeiro dia');

    const achievements = await api.get('/api/achievements').set('Authorization', `Bearer ${user.accessToken}`);
    expect(achievements.body.totalPoints).toBe(10); // POINTS.WATER_LOG
    expect(achievements.body.streakDays).toBe(1);
    const firstDay = achievements.body.achievements.find((a: { code: string }) => a.code === 'first_day');
    expect(firstDay.unlocked).toBe(true);
  });

  it('não desbloqueia a mesma conquista duas vezes', async () => {
    const user = await registerUser();
    await prisma.achievement.upsert({
      where: { code: 'first_day' },
      create: { code: 'first_day', title: 'Primeiro dia', description: '', icon: '🏆', criteriaType: 'first_day', criteriaValue: 1 },
      update: {},
    });

    const first = await api.post('/api/water').set('Authorization', `Bearer ${user.accessToken}`).send({ amountMl: 250 });
    expect(first.body.unlockedAchievements).toContain('Primeiro dia');

    const second = await api.post('/api/water').set('Authorization', `Bearer ${user.accessToken}`).send({ amountMl: 250 });
    expect(second.body.unlockedAchievements).not.toContain('Primeiro dia');

    const count = await prisma.userAchievement.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it('meta de água batida desbloqueia a conquista correspondente', async () => {
    const user = await registerUser();
    await prisma.achievement.upsert({
      where: { code: 'water_goal_hit' },
      create: { code: 'water_goal_hit', title: 'Meta de água', description: '', icon: '💧', criteriaType: 'water_goal_hit', criteriaValue: 1 },
      update: {},
    });
    await prisma.profile.update({ where: { userId: user.id }, data: { waterGoalMl: 500 } });

    const res = await api.post('/api/water').set('Authorization', `Bearer ${user.accessToken}`).send({ amountMl: 500 });
    expect(res.body.unlockedAchievements).toContain('Meta de água');
  });

  it('/api/progress/summary calcula o percentual geral do dia a partir dos registros reais', async () => {
    const user = await registerUser();
    await prisma.profile.update({ where: { userId: user.id }, data: { waterGoalMl: 1000 } });
    await api.post('/api/water').set('Authorization', `Bearer ${user.accessToken}`).send({ amountMl: 1000 });

    const summary = await api.get('/api/progress/summary').set('Authorization', `Bearer ${user.accessToken}`);
    expect(summary.status).toBe(200);
    expect(summary.body.water.totalMl).toBe(1000);
    expect(summary.body.water.goalMl).toBe(1000);
    // Água é 1 de 4 categorias (água/refeições/jejum/treino) — 100% batido
    // numa só categoria deve mover o percentual geral, sem fechar em 100%.
    expect(summary.body.overallPercent).toBeGreaterThan(0);
    expect(summary.body.overallPercent).toBeLessThan(100);
  });
});
