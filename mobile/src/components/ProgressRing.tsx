import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '../theme/useThemeColors';
import { typography } from '../theme/theme';

interface Props {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  emoji?: string;
}

export function ProgressRing({ progress, size = 64, strokeWidth = 7, color, trackColor, label, emoji }: Props) {
  const colors = useThemeColors();
  const ringColor = color || colors.primary;
  const bg = trackColor || colors.surfaceAlt;
  const radiusPx = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusPx}
            stroke={bg}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusPx}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.32 }}>{emoji}</Text>
        </View>
      </View>
      {label ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>{label}</Text>
      ) : null}
    </View>
  );
}
