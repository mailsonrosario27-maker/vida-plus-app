import React from 'react';
import { View, ViewProps } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing } from '../theme/theme';

export function Card({ style, ...props }: ViewProps) {
  const colors = useThemeColors();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}
