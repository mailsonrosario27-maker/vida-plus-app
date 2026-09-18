import React, { useEffect } from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing, typography } from '../theme/theme';
import { useNavigationStore } from '../state/navigationStore';

import { HomeScreen } from '../screens/home/HomeScreen';
import { NutritionScreen } from '../screens/nutrition/NutritionScreen';
import { FastingScreen } from '../screens/fasting/FastingScreen';
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

import { RecipeDetailScreen } from '../screens/nutrition/RecipeDetailScreen';
import { ShoppingListScreen } from '../screens/nutrition/ShoppingListScreen';
import { WorkoutSessionScreen } from '../screens/activities/WorkoutSessionScreen';
import { HydrationScreen } from '../screens/hydration/HydrationScreen';
import { TeasScreen } from '../screens/wellness/TeasScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { AssistantScreen } from '../screens/ai/AssistantScreen';
import { PaywallScreen } from '../screens/subscription/PaywallScreen';

const TABS: { key: 'home' | 'nutrition' | 'fasting' | 'activities' | 'profile'; label: string; emoji: string }[] = [
  { key: 'home', label: 'Início', emoji: '🏠' },
  { key: 'nutrition', label: 'Alimentação', emoji: '🥗' },
  { key: 'fasting', label: 'Jejum', emoji: '⏱️' },
  { key: 'activities', label: 'Atividades', emoji: '🏃' },
  { key: 'profile', label: 'Perfil', emoji: '👤' },
];

function ActiveTabScreen() {
  const activeTab = useNavigationStore((s) => s.activeTab);
  switch (activeTab) {
    case 'home':
      return <HomeScreen />;
    case 'nutrition':
      return <NutritionScreen />;
    case 'fasting':
      return <FastingScreen />;
    case 'activities':
      return <ActivitiesScreen />;
    case 'profile':
      return <ProfileScreen />;
  }
}

function StackOverlay() {
  const stack = useNavigationStore((s) => s.stack);
  const top = stack[stack.length - 1];
  if (!top) return null;

  switch (top.name) {
    case 'recipeDetail':
      return <RecipeDetailScreen recipeId={top.recipeId} />;
    case 'shoppingList':
      return <ShoppingListScreen />;
    case 'workoutSession':
      return <WorkoutSessionScreen sessionId={top.sessionId} workoutId={top.workoutId} />;
    case 'hydration':
      return <HydrationScreen />;
    case 'teas':
      return <TeasScreen />;
    case 'progress':
      return <ProgressScreen />;
    case 'assistant':
      return <AssistantScreen />;
    case 'paywall':
      return <PaywallScreen />;
    default:
      return null;
  }
}

function TabBar() {
  const colors = useThemeColors();
  const activeTab = useNavigationStore((s) => s.activeTab);
  const setTab = useNavigationStore((s) => s.setTab);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.xs,
        paddingBottom: spacing.sm,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setTab(tab.key)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.xs }}
          >
            <Text style={{ fontSize: 20, opacity: active ? 1 : 0.5 }}>{tab.emoji}</Text>
            <Text
              style={[
                typography.small,
                { color: active ? colors.primary : colors.textMuted, marginTop: 2, fontWeight: active ? '700' : '500' },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  const colors = useThemeColors();
  const stack = useNavigationStore((s) => s.stack);
  const pop = useNavigationStore((s) => s.pop);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, pop]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>{stack.length > 0 ? <StackOverlay /> : <ActiveTabScreen />}</View>
      {stack.length === 0 && <TabBar />}
    </View>
  );
}
