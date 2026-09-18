import React from 'react';
import { View } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { radius } from '../theme/theme';

export function ProgressBar({ progress, color, height = 8 }: { progress: number; color?: string; height?: number }) {
  const colors = useThemeColors();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: color || colors.primary,
        }}
      />
    </View>
  );
}
