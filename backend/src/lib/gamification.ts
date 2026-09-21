import { prisma } from './prisma';
import { startOfTodayInTz, dateKeyInTz, resolveUserTimezone } from './dateBoundaries';

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
async function activeDatesSet(userId: string, timeZone: string): Promise<Set<string>> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  since.setUTCHours(0, 0, 0, 0);

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
  const add = (d: Date | null) => d && dates.add(dateKeyInTz(d, timeZone));
  waters.forEach((w) => add(w.loggedAt));
  meals.forEach((m) => add(m.loggedAt));
  workouts.forEach((w) => add(w.completedAt));
  fasts.forEach((f) => add(f.endedAt));
  return dates;
}

export async function currentStreak(userId: string, timeZone?: string): Promise<number> {
  const tz = timeZone || (await resolveUserTimezone(userId));
  const dates = await activeDatesSet(userId, tz);
  let streak = 0;
  const cursor = startOfTodayInTz(tz);
  while (dates.has(dateKeyInTz(cursor, tz))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

const ACHIEVEMENT_CHECKS: Record<string, (userId: string, timeZone: string) => Promise<boolean>> = {
  first_day: async (userId, timeZone) => (await activeDatesSet(userId, timeZone)).size >= 1,
  streak_3: async (userId, timeZone) => (await currentStreak(userId, timeZone)) >= 3,
  streak_7: async (userId, timeZone) => (await currentStreak(userId, timeZone)) >= 7,
  streak_30: async (userId, timeZone) => (await currentStreak(userId, timeZone)) >= 30,
  workouts_10: async (userId) =>
    (await prisma.workoutSession.count({ where: { userId, status: 'COMPLETED' } })) >= 10,
  meals_10: async (userId) => (await prisma.mealLog.count({ where: { userId } })) >= 10,
  water_goal_hit: async (userId, timeZone) => {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const goal = profile?.waterGoalMl || 2000;
    const logs = await prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: startOfTodayInTz(timeZone) } } });
    return logs.reduce((s, l) => s + l.amountMl, 0) >= goal;
  },
};

export async function checkAndUnlockAchievements(userId: string, timeZone?: string) {
  const tz = timeZone || (await resolveUserTimezone(userId));
  const achievements = await prisma.achievement.findMany();
  const alreadyUnlocked = await prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } });
  const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievementId));

  const newlyUnlocked: string[] = [];
  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue;
    const check = ACHIEVEMENT_CHECKS[achievement.criteriaType];
    if (!check) continue;
    if (await check(userId, tz)) {
      await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
      newlyUnlocked.push(achievement.title);
    }
  }
  return newlyUnlocked;
}
