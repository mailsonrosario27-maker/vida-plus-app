import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { useAuthStore } from '../../state/authStore';
import { useNavigationStore } from '../../state/navigationStore';
import { api } from '../../api/client';

interface Summary {
  water: { totalMl: number; goalMl: number };
  meals: { count: number; goal: number };
  exercise: { minutes: number; goalMinutes: number };
  fasting: { active: boolean };
  overallPercent: number;
  totalPoints: number;
  streakDays: number;
}

interface PlanItem {
  time: string;
  type: string;
  title: string;
  emoji: string;
  done: boolean;
}

const QUICK_ACTIONS: { key: string; emoji: string; label: string }[] = [
  { key: 'nutrition', emoji: '🥗', label: 'Alimentação' },
  { key: 'hydration', emoji: '💧', label: 'Hidratação' },
  { key: 'fasting', emoji: '⏱️', label: 'Jejum' },
  { key: 'activities', emoji: '🏃', label: 'Movimento' },
  { key: 'wellness', emoji: '🍵', label: 'Bem-estar' },
  { key: 'progress', emoji: '📊', label: 'Evolução' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dynamicMessage(percent: number): string {
  if (percent === 0) return 'Hoje é mais um dia para cuidar de você.';
  if (percent < 50) return 'Cada pequena ação conta. Vamos continuar?';
  if (percent < 100) return 'Você está indo muito bem hoje!';
  return 'Dia completo! Sinta orgulho da sua consistência. 🎉';
}

export function HomeScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const setTab = useNavigationStore((s) => s.setTab);
  const push = useNavigationStore((s) => s.push);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [summaryRes, planRes] = await Promise.all([
        api.get('/progress/summary'),
        api.get('/progress/plan/today'),
      ]);
      setSummary(summaryRes.data);
      setPlan(planRes.data.plan);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quickAddWater = async () => {
    await api.post('/water', { amountMl: 250 });
    load();
  };

  const handleQuickAction = (key: string) => {
    if (key === 'nutrition') setTab('nutrition');
    else if (key === 'fasting') setTab('fasting');
    else if (key === 'activities') setTab('activities');
    else if (key === 'hydration') push({ name: 'hydration' });
    else if (key === 'wellness') push({ name: 'teas' });
    else if (key === 'progress') push({ name: 'progress' });
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const waterLiters = ((summary?.water.totalMl || 0) / 1000).toFixed(1);
  const waterGoalLiters = ((summary?.water.goalMl || 2000) / 1000).toFixed(1);

  return (
    <Screen>
      <Text style={[typography.h2, { color: colors.textPrimary }]}>
        {greeting()}, {profile?.name?.split(' ')[0] || ''} 👋
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg }]}>
        {dynamicMessage(summary?.overallPercent || 0)}
      </Text>

      {(summary?.water.totalMl || 0) === 0 && (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.waterSoft, borderColor: colors.waterSoft }}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            Você já bebeu água hoje? 💧
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <PrimaryButton label="Sim, registrar" onPress={quickAddWater} style={{ flex: 1 }} />
            <PrimaryButton label="Ainda não" variant="outline" onPress={() => push({ name: 'hydration' })} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => handleQuickAction(action.key)}
            style={{ width: '33.33%', alignItems: 'center', paddingVertical: spacing.sm }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 24 }}>{action.emoji}</Text>
            </View>
            <Text style={[typography.small, { color: colors.textSecondary }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>Progresso de hoje</Text>

        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>🥗 Alimentação</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{summary?.meals.count} / {summary?.meals.goal} refeições</Text>
          </View>
          <ProgressBar progress={(summary?.meals.count || 0) / (summary?.meals.goal || 4)} color={colors.accentWarm} />
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>💧 Água</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{waterLiters}L / {waterGoalLiters}L</Text>
          </View>
          <ProgressBar progress={(summary?.water.totalMl || 0) / (summary?.water.goalMl || 2000)} color={colors.water} />
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>⏱️ Jejum</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{summary?.fasting.active ? 'Em andamento' : 'Não iniciado'}</Text>
          </View>
          <ProgressBar progress={summary?.fasting.active ? 0.5 : 0} color={colors.fasting} />
        </View>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>🏃 Exercícios</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{summary?.exercise.minutes} / {summary?.exercise.goalMinutes} min</Text>
          </View>
          <ProgressBar progress={(summary?.exercise.minutes || 0) / (summary?.exercise.goalMinutes || 30)} color={colors.primary} />
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
        <Text style={[typography.h1, { color: colors.primary }]}>{summary?.overallPercent}%</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Você completou {summary?.overallPercent}% do seu dia.
        </Text>
        <PrimaryButton label="VER MEU PROGRESSO" onPress={() => push({ name: 'progress' })} />
      </Card>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>Sua rotina de hoje</Text>
      <Card>
        {plan.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderBottomWidth: i < plan.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={[typography.caption, { color: colors.textMuted, width: 48 }]}>{item.time}</Text>
            <Text style={{ fontSize: 18, marginRight: spacing.sm }}>{item.emoji}</Text>
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1, textDecorationLine: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }]}>
              {item.title}
            </Text>
            {item.done && <Text style={{ color: colors.primary }}>✓</Text>}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
