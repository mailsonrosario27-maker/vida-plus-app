import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { api } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface Workout {
  id: string;
  title: string;
  level: string;
  category: string;
  durationMin: number;
  description: string;
}

const LEVELS = [
  { value: '', label: 'Todos' },
  { value: 'BEGINNER', label: 'Iniciante' },
  { value: 'INTERMEDIATE', label: 'Intermediário' },
  { value: 'ADVANCED', label: 'Avançado' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  WALK: '🚶',
  RUN: '🏃',
  BIKE: '🚴',
  HOME: '🏠',
  MOBILITY: '🤸',
  STRETCH: '🧘',
  STRENGTH: '💪',
};

export function ActivitiesScreen() {
  const colors = useThemeColors();
  const push = useNavigationStore((s) => s.push);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/workouts', { params: level ? { level } : {} })
      .then((res) => setWorkouts(res.data))
      .finally(() => setLoading(false));
  }, [level]);

  const startWorkout = async (workout: Workout) => {
    setStarting(workout.id);
    try {
      const res = await api.post(`/workouts/${workout.id}/start`);
      push({ name: 'workoutSession', sessionId: res.data.id, workoutId: workout.id });
    } finally {
      setStarting(null);
    }
  };

  return (
    <Screen>
      <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.md }]}>Movimente-se 🏃</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
        {LEVELS.map((l) => (
          <Chip key={l.value} label={l.label} active={level === l.value} onPress={() => setLevel(l.value)} />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : workouts.length === 0 ? (
        <EmptyState emoji="🏃" title="Nenhum treino encontrado" />
      ) : (
        workouts.map((w) => (
          <Card key={w.id} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 24, marginRight: spacing.sm }}>{CATEGORY_EMOJI[w.category] || '🏃'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{w.title}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>{w.durationMin} minutos</Text>
              </View>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>{w.description}</Text>
            <PrimaryButton label="COMEÇAR TREINO" onPress={() => startWorkout(w)} loading={starting === w.id} />
          </Card>
        ))
      )}
    </Screen>
  );
}
