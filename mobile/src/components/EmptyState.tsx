import React from 'react';
import { View, Text } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing, typography } from '../theme/theme';

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg }}>
      <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>{emoji}</Text>
      <Text style={[typography.h3, { color: colors.textPrimary, textAlign: 'center' }]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
