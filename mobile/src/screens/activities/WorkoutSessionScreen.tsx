import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface WorkoutItem {
  name: string;
  durationSec?: number;
  reps?: number;
  restSec?: number;
  instructions?: string;
}

export function WorkoutSessionScreen({ sessionId, workoutId }: { sessionId: string; workoutId: string }) {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'exercise' | 'rest'>('exercise');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startedAt] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api
      .get(`/workouts/${workoutId}`)
      .then((res) => {
        setTitle(res.data.title);
        setItems(res.data.items);
        setSecondsLeft(res.data.items[0]?.durationSec || 0);
      })
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [workoutId]);

  useEffect(() => {
    if (loading || finished) return;
    const current = items[index];
    const duration = phase === 'exercise' ? current?.durationSec : current?.restSec;
    if (!duration) return;
    if (secondsLeft <= 0) {
      advance();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, loading, finished, phase, index]);

  const advance = () => {
    const current = items[index];
    if (phase === 'exercise' && current?.restSec) {
      setPhase('rest');
      setSecondsLeft(current.restSec);
      return;
    }
    if (index < items.length - 1) {
      const next = index + 1;
      setIndex(next);
      setPhase('exercise');
      setSecondsLeft(items[next]?.durationSec || 0);
    } else {
      complete();
    }
  };

  const complete = async () => {
    if (completing) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      await api.post(`/workouts/sessions/${sessionId}/complete`, { durationMin });
      setFinished(true);
    } catch (err) {
      setCompleteError(apiErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  const cancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await api.post(`/workouts/sessions/${sessionId}/cancel`);
      pop();
    } catch (err) {
      Alert.alert('Não foi possível encerrar o treino', apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
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

  if (loadError) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState emoji="⚠️" title="Não foi possível carregar o treino" subtitle={loadError} />
          <PrimaryButton label="Voltar" onPress={pop} />
        </View>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: 56, marginBottom: spacing.md }}>🔥</Text>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Treino concluído!</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' }]}>
            Muito bem! Isso foi registrado no seu histórico e soma pontos na sua evolução.
          </Text>
          <PrimaryButton label="Voltar" onPress={pop} />
        </View>
      </Screen>
    );
  }

  const current = items[index];
  const hasDuration = Boolean(current?.durationSec);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{title}</Text>
        <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          {phase === 'rest' ? 'Descanso' : current?.name}
        </Text>
        <ProgressBar progress={(index + 1) / items.length} />
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl }]}>
          Etapa {index + 1} de {items.length}
        </Text>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {phase === 'exercise' && hasDuration ? (
            <Text style={{ fontSize: 64, fontWeight: '700', color: colors.primary }}>{secondsLeft}s</Text>
          ) : phase === 'rest' ? (
            <Text style={{ fontSize: 64, fontWeight: '700', color: colors.accentWarm }}>{secondsLeft}s</Text>
          ) : (
            <Text style={{ fontSize: 48, fontWeight: '700', color: colors.primary }}>{current?.reps} reps</Text>
          )}
          {current?.instructions && phase === 'exercise' ? (
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' }]}>
              {current.instructions}
            </Text>
          ) : null}
        </View>

        {completeError ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' }]}>
              {completeError}
            </Text>
            <PrimaryButton label="Tentar novamente" onPress={complete} loading={completing} />
          </View>
        ) : null}

        {!hasDuration && phase === 'exercise' ? (
          <PrimaryButton label="Concluir etapa" onPress={advance} disabled={completing} />
        ) : null}

        <PrimaryButton
          label="Encerrar treino"
          variant="ghost"
          onPress={cancel}
          disabled={cancelling}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Screen>
  );
}
