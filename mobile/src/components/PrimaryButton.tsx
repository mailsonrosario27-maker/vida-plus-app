import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const colors = useThemeColors();

  const backgrounds: Record<string, string> = {
    primary: colors.primary,
    secondary: colors.accentWarm,
    outline: 'transparent',
    ghost: 'transparent',
  };
  const textColors: Record<string, string> = {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    outline: colors.primary,
    ghost: colors.textSecondary,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: backgrounds[variant],
          borderRadius: radius.pill,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.primary,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <Text style={[typography.bodyBold, { color: textColors[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}
