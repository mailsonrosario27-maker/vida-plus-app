import React from 'react';
import { Pressable, Text } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/theme';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
      }}
    >
      <Text style={[typography.caption, { color: active ? '#FFFFFF' : colors.textSecondary, fontWeight: '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}
