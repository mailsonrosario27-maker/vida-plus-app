import React from 'react';
import { View, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { useAuthStore } from '../../state/authStore';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Emagrecer com consistência',
  MAINTAIN: 'Manter seu peso atual',
  GAIN_MUSCLE: 'Ganhar massa muscular',
  HEALTHY_HABITS: 'Construir hábitos mais saudáveis',
};

export function SummaryScreen({ onStart }: { onStart: () => void }) {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  const rows = [
    { emoji: '🎯', title: 'Seu objetivo', value: GOAL_LABELS[profile?.goal || 'HEALTHY_HABITS'] },
    { emoji: '💧', title: 'Sua hidratação', value: `Meta diária de ${((profile?.waterGoalMl || 2000) / 1000).toFixed(1)}L de água` },
    { emoji: '🥗', title: 'Sua alimentação', value: 'Cardápio personalizado por período do dia' },
    { emoji: '🏃', title: 'Seu movimento', value: 'Treinos adaptados ao seu nível de experiência' },
    { emoji: '⏱️', title: 'Seu acompanhamento', value: 'Rotina diária montada automaticamente pelo Assistente VIDA+' },
  ];

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg }}>
        <Text style={{ fontSize: 52, marginBottom: spacing.md }}>✅</Text>
        <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center' }]}>Seu plano está pronto.</Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
          Olá, {profile?.name}! Montamos um resumo personalizado com base no que você nos contou.
        </Text>
      </View>

      {rows.map((row) => (
        <Card key={row.title} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontSize: 28, marginRight: spacing.md }}>{row.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{row.title}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{row.value}</Text>
          </View>
        </Card>
      ))}

      <Text style={[typography.small, { color: colors.textMuted, marginVertical: spacing.md, textAlign: 'center' }]}>
        As informações acima têm caráter educativo e não substituem acompanhamento médico ou nutricional
        profissional.
      </Text>

      <PrimaryButton label="COMEÇAR MEU DIA" onPress={onStart} />
    </Screen>
  );
}
