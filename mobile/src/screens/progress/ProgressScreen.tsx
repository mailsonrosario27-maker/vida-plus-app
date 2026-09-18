import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface CalendarDay {
  date: string;
  status: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
}

const STATUS_EMOJI: Record<string, string> = { COMPLETE: '🟢', PARTIAL: '🟡', EMPTY: '⚪' };

export function ProgressScreen() {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [loading, setLoading] = useState(true);
  const [achievementsData, setAchievementsData] = useState<{ totalPoints: number; level: number; streakDays: number; achievements: Achievement[] } | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [waterHistory, setWaterHistory] = useState<{ date: string; totalMl: number }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/achievements'), api.get('/progress/calendar', { params: { days: 28 } }), api.get('/water/history', { params: { days: 7 } })])
      .then(([a, c, w]) => {
        setAchievementsData(a.data);
        setCalendar(c.data);
        setWaterHistory(w.data);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError || !achievementsData) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState emoji="⚠️" title="Não foi possível carregar sua evolução" subtitle={loadError ?? undefined} />
          <PrimaryButton label="Tentar novamente" onPress={load} />
        </View>
      </Screen>
    );
  }

  const maxWater = Math.max(1, ...waterHistory.map((w) => w.totalMl));

  return (
    <Screen>
      <Pressable onPress={pop} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
      </Pressable>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.lg }]}>Minha Evolução 📊</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28 }}>🔥</Text>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>{achievementsData.streakDays}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>dias seguidos</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28 }}>⭐</Text>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>{achievementsData.totalPoints}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>pontos · nível {achievementsData.level}</Text>
        </Card>
      </View>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Água nos últimos 7 dias</Text>
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', height: 100, paddingTop: spacing.md }}>
        {waterHistory.length === 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Sem registros ainda.</Text>
        ) : (
          waterHistory.map((w) => (
            <View key={w.date} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: 14,
                  height: Math.max(4, (w.totalMl / maxWater) * 70),
                  backgroundColor: colors.water,
                  borderRadius: radius.sm,
                }}
              />
              <Text style={[typography.small, { color: colors.textMuted, marginTop: 4 }]}>
                {new Date(w.date).toLocaleDateString('pt-BR', { weekday: 'narrow' })}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Calendário de consistência</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {calendar.map((day) => (
            <Text key={day.date} style={{ fontSize: 16, width: '14.28%', textAlign: 'center', marginBottom: 6 }}>
              {STATUS_EMOJI[day.status]}
            </Text>
          ))}
        </View>
        <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.sm }]}>
          🟢 dia completo · 🟡 dia parcial · ⚪ sem registro
        </Text>
      </Card>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Conquistas</Text>
      {achievementsData.achievements.map((a) => (
        <Card
          key={a.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.sm,
            opacity: a.unlocked ? 1 : 0.45,
          }}
        >
          <Text style={{ fontSize: 26, marginRight: spacing.md }}>{a.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{a.title}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{a.description}</Text>
          </View>
          {a.unlocked && <Text style={{ color: colors.primary }}>✓</Text>}
        </Card>
      ))}
    </Screen>
  );
}
