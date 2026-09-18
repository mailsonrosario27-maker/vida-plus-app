import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated, TextInput, Alert } from 'react-native';
import Svg, { Rect, Defs, ClipPath } from 'react-native-svg';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const QUICK_AMOUNTS = [
  { label: 'Copo — 250ml', value: 250 },
  { label: '500ml', value: 500 },
  { label: '750ml', value: 750 },
  { label: '1 litro', value: 1000 },
];

function BottleFill({ progress }: { progress: number }) {
  const colors = useThemeColors();
  const anim = useRef(new Animated.Value(0)).current;
  const width = 100;
  const height = 180;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress]);

  const fillHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] });
  const fillY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id="bottleClip">
            <Rect x={10} y={0} width={width - 20} height={height} rx={18} />
          </ClipPath>
        </Defs>
        <Rect x={10} y={0} width={width - 20} height={height} rx={18} fill={colors.surfaceAlt} stroke={colors.border} strokeWidth={2} />
        <AnimatedRect x={10} width={width - 20} height={fillHeight} y={fillY} fill={colors.water} clipPath="url(#bottleClip)" />
      </Svg>
    </View>
  );
}

export function HydrationScreen() {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [totalMl, setTotalMl] = useState(0);
  const [goalMl, setGoalMl] = useState(2000);
  const [logs, setLogs] = useState<{ id: string; amountMl: number; loggedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api
      .get('/water/today')
      .then((res) => {
        setTotalMl(res.data.totalMl);
        setGoalMl(res.data.goalMl);
        setLogs(res.data.logs);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addWater = async (amountMl: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post('/water', { amountMl });
      load();
    } catch (err) {
      Alert.alert('Não foi possível registrar a água', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
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
          <EmptyState emoji="⚠️" title="Não foi possível carregar sua água" subtitle={loadError} />
          <PrimaryButton
            label="Tentar novamente"
            onPress={() => {
              setLoading(true);
              load();
            }}
          />
        </View>
      </Screen>
    );
  }

  const progress = totalMl / goalMl;

  return (
    <Screen>
      <Pressable onPress={pop} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
      </Pressable>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.lg }]}>Minha Água 💧</Text>

      <Card style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <BottleFill progress={progress} />
        <Text style={[typography.h2, { color: colors.water, marginTop: spacing.md }]}>
          {(totalMl / 1000).toFixed(2)}L / {(goalMl / 1000).toFixed(1)}L
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Meta diária</Text>
      </Card>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Adicionar</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg, gap: spacing.sm }}>
        {QUICK_AMOUNTS.map((q) => (
          <Pressable
            key={q.value}
            onPress={() => addWater(q.value)}
            disabled={submitting}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: colors.waterSoft,
              opacity: submitting ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.water, fontWeight: '700' }}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <TextInput
          placeholder="Quantidade personalizada (ml)"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={customAmount}
          onChangeText={setCustomAmount}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            color: colors.textPrimary,
          }}
        />
      </View>
      <PrimaryButton
        label="Registrar quantidade personalizada"
        variant="outline"
        loading={submitting}
        onPress={() => {
          const amount = Number(customAmount);
          if (amount > 0) {
            addWater(amount);
            setCustomAmount('');
          }
        }}
      />

      <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Registros de hoje
      </Text>
      {logs.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>Nenhum registro ainda hoje.</Text>
      ) : (
        <Card>
          {logs.map((log, i) => (
            <View
              key={log.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.xs,
                borderBottomWidth: i < logs.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]}>{log.amountMl}ml</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
