import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api } from '../../api/client';
import { useAuthStore } from '../../state/authStore';
import { useNavigationStore } from '../../state/navigationStore';

const FEATURES = [
  'Cardápios personalizados para o seu objetivo',
  'Biblioteca completa de receitas',
  'Planos de exercícios para todos os níveis',
  'Histórico completo de evolução',
  'Assistente VIDA+ com IA ilimitado',
  'Conteúdos exclusivos e novidades toda semana',
];

export function PaywallScreen() {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [loading, setLoading] = useState(false);
  const subscription = useAuthStore((s) => s.subscription);

  const subscribe = async () => {
    setLoading(true);
    try {
      // Ponto de integração real com RevenueCat / App Store / Google Play
      // In-App Purchases — veja src/api e backend/src/routes/subscription.routes.ts.
      await api.post('/subscription/subscribe', { provider: 'MANUAL', trialDays: 7 });
      await useAuthStore.getState().refreshMe();
      pop();
    } finally {
      setLoading(false);
    }
  };

  const isPremium = subscription?.plan === 'PREMIUM';

  return (
    <Screen>
      <Pressable onPress={pop} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
      </Pressable>

      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🌿</Text>
        <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center' }]}>VIDA+ Premium</Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
          Tenha sua rotina saudável organizada em um único lugar.
        </Text>
      </View>

      {isPremium ? (
        <Card style={{ alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Text style={[typography.h3, { color: colors.primaryDark }]}>Você já é Premium! 🎉</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Aproveite todos os recursos exclusivos do VIDA+.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: spacing.lg }}>
            {FEATURES.map((f, i) => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < FEATURES.length - 1 ? spacing.sm : 0 }}>
                <Text style={{ color: colors.primary, marginRight: spacing.sm }}>✓</Text>
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{f}</Text>
              </View>
            ))}
          </Card>

          <Card style={{ marginBottom: spacing.lg, borderColor: colors.primary, borderWidth: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>R$ 29,90/mês</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>7 dias grátis, cancele quando quiser</Text>
              </View>
              <View style={{ backgroundColor: colors.accentWarmSoft, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: colors.accentWarm, fontWeight: '700', fontSize: 12 }}>7 DIAS GRÁTIS</Text>
              </View>
            </View>
          </Card>

          <PrimaryButton label="Iniciar teste grátis" onPress={subscribe} loading={loading} />
          <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' }]}>
            A compra é processada pela App Store ou Google Play. Você pode cancelar a qualquer momento nas
            configurações da sua conta.
          </Text>
        </>
      )}
    </Screen>
  );
}
