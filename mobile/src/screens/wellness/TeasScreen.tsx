import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { api } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface TeaRecipe {
  id: string;
  title: string;
  category: string;
  description: string;
  bestTime?: string | null;
  cautions?: string | null;
  ingredients: { name: string; quantity?: string }[];
  steps: string[];
}

export function TeasScreen() {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [items, setItems] = useState<TeaRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get('/recipes', { params: { category: 'TEA' } }), api.get('/recipes', { params: { category: 'DRINK' } })])
      .then(([teas, drinks]) => setItems([...teas.data, ...drinks.data]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen>
      <Pressable onPress={pop} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
      </Pressable>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Chás & Bebidas 🍵</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Opções que podem fazer parte de uma rotina de bem-estar e hidratação.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState emoji="🍵" title="Em breve novidades por aqui" />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => setExpanded(expanded === item.id ? null : item.id)} style={{ marginBottom: spacing.md }}>
            <Card>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{item.description}</Text>
              {item.bestTime && (
                <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>🕐 Melhor horário: {item.bestTime}</Text>
              )}

              {expanded === item.id && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Ingredientes</Text>
                  {item.ingredients.map((ing, i) => (
                    <Text key={i} style={[typography.body, { color: colors.textPrimary }]}>
                      • {ing.name}{ing.quantity ? ` — ${ing.quantity}` : ''}
                    </Text>
                  ))}
                  <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
                    Preparo
                  </Text>
                  {item.steps.map((step, i) => (
                    <Text key={i} style={[typography.body, { color: colors.textPrimary, marginBottom: 2 }]}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                  {item.cautions && (
                    <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.md }]}>⚠️ {item.cautions}</Text>
                  )}
                </View>
              )}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
