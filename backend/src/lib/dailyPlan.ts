import { prisma } from './prisma';
import { MealPeriod } from '@prisma/client';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function toHHMM(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export type PlanItem = {
  time: string;
  type: 'WATER' | 'MEAL' | 'EXERCISE' | 'FASTING_START' | 'FASTING_END' | 'WIND_DOWN';
  title: string;
  emoji: string;
  period?: MealPeriod;
  done: boolean;
};

// Monta a linha do tempo do dia a partir da rotina cadastrada no onboarding
// (seção 14 do produto): o usuário não precisa procurar o que fazer — o
// VIDA+ já entrega o roteiro do dia e vai marcando o que foi cumprido.
export async function getTodayPlan(userId: string): Promise<PlanItem[]> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const wake = toMinutes(profile?.wakeTime || '07:00');
  const sleep = toMinutes(profile?.sleepTime || '22:30');
  const dayLength = ((sleep - wake + 1440) % 1440) || 900;

  const template: Omit<PlanItem, 'done'>[] = [
    { time: toHHMM(wake), type: 'WATER', title: 'Água ao acordar', emoji: '💧' },
    { time: toHHMM(wake + 30), type: 'MEAL', title: 'Café da manhã', emoji: '🥗', period: MealPeriod.MORNING },
    { time: toHHMM(wake + Math.round(dayLength * 0.22)), type: 'WATER', title: 'Água', emoji: '💧' },
    { time: toHHMM(wake + Math.round(dayLength * 0.4)), type: 'MEAL', title: 'Almoço', emoji: '🍽️', period: MealPeriod.AFTERNOON },
    { time: toHHMM(wake + Math.round(dayLength * 0.55)), type: 'WATER', title: 'Água', emoji: '💧' },
    { time: toHHMM(wake + Math.round(dayLength * 0.68)), type: 'EXERCISE', title: 'Movimente-se', emoji: '🏃' },
    { time: toHHMM(wake + Math.round(dayLength * 0.82)), type: 'MEAL', title: 'Jantar', emoji: '🍽️', period: MealPeriod.NIGHT },
    { time: toHHMM(sleep - 60), type: 'WIND_DOWN', title: 'Preparação para dormir', emoji: '🌙' },
  ];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [waterLogs, mealLogs, workoutSessions] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.mealLog.findMany({ where: { userId, loggedAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: startOfDay, lte: endOfDay } },
    }),
  ]);

  const totalWaterToday = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);
  const waterGoal = profile?.waterGoalMl || 2000;
  const waterItems = template.filter((t) => t.type === 'WATER');

  let waterSeen = 0;
  return template.map((item): PlanItem => {
    if (item.type === 'WATER') {
      waterSeen += 1;
      const targetFraction = waterSeen / waterItems.length;
      return { ...item, done: totalWaterToday >= waterGoal * targetFraction };
    }
    if (item.type === 'MEAL') {
      return { ...item, done: mealLogs.some((m) => m.period === item.period) };
    }
    if (item.type === 'EXERCISE') {
      return { ...item, done: workoutSessions.length > 0 };
    }
    return { ...item, done: false };
  });
}
