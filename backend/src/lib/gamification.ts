import { prisma } from './prisma';

export const POINTS = {
  WATER_LOG: 10,
  MEAL_LOG: 15,
  WORKOUT_COMPLETE: 20,
  FASTING_COMPLETE: 25,
  ROUTINE_COMPLETE: 20,
} as const;

export async function awardPoints(userId: string, points: number, reason: string) {
  await prisma.pointsLedgerEntry.create({ data: { userId, points, reason } });
}

// Limitado aos últimos 90 dias — suficiente para toda conquista baseada em streak
// (a mais longa é de 30 dias), evita varrer o histórico completo do usuário a cada log.
async function activeDatesSet(userId: string): Promise<Set<string>> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  since.setHours(0, 0, 0, 0);

  const [waters, meals, workouts, fasts] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: since } }, select: { loggedAt: true } }),
    prisma.mealLog.findMany({ where: { userId, loggedAt: { gte: since } }, select: { loggedAt: true } }),
    prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.fastingSession.findMany({
      where: { userId, status: 'COMPLETED', endedAt: { gte: since } },
      select: { endedAt: true },
    }),
  ]);
  const dates = new Set<string>();
  const add = (d: Date | null) => d && dates.add(d.toISOString().slice(0, 10));
  waters.forEach((w) => add(w.loggedAt));
  meals.forEach((m) => add(m.loggedAt));
  workouts.forEach((w) => add(w.completedAt));
  fasts.forEach((f) => add(f.endedAt));
  return dates;
}

export async function currentStreak(userId: string): Promise<number> {
  const dates = await activeDatesSet(userId);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const ACHIEVEMENT_CHECKS: Record<string, (userId: string) => Promise<boolean>> = {
  first_day: async (userId) => (await activeDatesSet(userId)).size >= 1,
  streak_3: async (userId) => (await currentStreak(userId)) >= 3,
  streak_7: async (userId) => (await currentStreak(userId)) >= 7,
  streak_30: async (userId) => (await currentStreak(userId)) >= 30,
  workouts_10: async (userId) =>
    (await prisma.workoutSession.count({ where: { userId, status: 'COMPLETED' } })) >= 10,
  meals_10: async (userId) => (await prisma.mealLog.count({ where: { userId } })) >= 10,
  water_goal_hit: async (userId) => {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const goal = profile?.waterGoalMl || 2000;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const logs = await prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: startOfDay } } });
    return logs.reduce((s, l) => s + l.amountMl, 0) >= goal;
  },
};

export async function checkAndUnlockAchievements(userId: string) {
  const achievements = await prisma.achievement.findMany();
  const alreadyUnlocked = await prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } });
  const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievementId));

  const newlyUnlocked: string[] = [];
  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue;
    const check = ACHIEVEMENT_CHECKS[achievement.criteriaType];
    if (!check) continue;
    if (await check(userId)) {
      await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
      newlyUnlocked.push(achievement.title);
    }
  }
  return newlyUnlocked;
}
