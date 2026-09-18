import React from 'react';
import { SafeAreaView, ScrollView, View, ViewProps, ScrollViewProps, Platform } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing } from '../theme/theme';

interface Props extends ScrollViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ scroll = true, padded = true, children, style, ...props }: Props) {
  const colors = useThemeColors();
  const content = (
    <View style={{ padding: padded ? spacing.lg : 0, paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.lg }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ paddingBottom: spacing.xxl }, style]}
          showsVerticalScrollIndicator={false}
          {...props}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, style as ViewProps['style']]}>{content}</View>
      )}
    </SafeAreaView>
  );
}
