import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { PrimaryButton } from '../../components/PrimaryButton';

const SLIDES = [
  { emoji: '🌱', title: 'Comece sua transformação hoje.', subtitle: 'Pequenas ações diárias que constroem uma vida mais saudável e leve.' },
  { emoji: '🥗', title: 'Organize sua alimentação.', subtitle: 'Cardápios, receitas e sugestões pensadas para a sua rotina.' },
  { emoji: '💧', title: 'Controle sua hidratação.', subtitle: 'Lembretes inteligentes para você nunca mais esquecer da água.' },
  { emoji: '🏃', title: 'Crie uma rotina de exercícios.', subtitle: 'Treinos para todos os níveis, do iniciante ao avançado.' },
  { emoji: '⏱️', title: 'Aprenda a utilizar o jejum de forma consciente.', subtitle: 'Orientações educativas e um timer para acompanhar cada fase.' },
  { emoji: '📊', title: 'Acompanhe sua evolução todos os dias.', subtitle: 'Gráficos, sequências e conquistas para celebrar seu progresso.' },
];

export function OnboardingSlides({ onDone }: { onDone: () => void }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      onDone();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ alignItems: 'flex-end', padding: spacing.lg }}>
        <Pressable onPress={onDone}>
          <Text style={[typography.body, { color: colors.textMuted }]}>Pular</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            <View
              style={{
                width: 140,
                height: 140,
                borderRadius: radius.xl,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.xl,
              }}
            >
              <Text style={{ fontSize: 64 }}>{slide.emoji}</Text>
            </View>
            <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }]}>
              {slide.title}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.lg }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 20 : 8,
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: i === index ? colors.primary : colors.border,
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <PrimaryButton label={index === SLIDES.length - 1 ? 'Começar' : 'Continuar'} onPress={next} />
      </View>
    </View>
  );
}
