import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/state/authStore';
import { useUiStore } from './src/state/uiStore';
import { useThemeColors } from './src/theme/useThemeColors';
import { OnboardingSlides } from './src/screens/onboarding/OnboardingSlides';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { ProfileSetup } from './src/screens/onboarding/ProfileSetup';
import { SummaryScreen } from './src/screens/onboarding/SummaryScreen';
import { MainTabs } from './src/navigation/MainTabs';

type EntryStage = 'slides' | 'auth';

function Splash() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🌿</Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const setDarkMode = useUiStore((s) => s.setDarkMode);

  const [entryStage, setEntryStage] = useState<EntryStage>('slides');
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (profile) setDarkMode(profile.darkMode);
  }, [profile?.darkMode]);

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'signedOut') {
    return (
      <>
        <StatusBar style="auto" />
        {entryStage === 'slides' ? (
          <OnboardingSlides onDone={() => setEntryStage('auth')} />
        ) : (
          <AuthScreen onBack={() => setEntryStage('slides')} />
        )}
      </>
    );
  }

  // signedIn
  if (profile && !profile.onboardingCompleted) {
    return (
      <>
        <StatusBar style="auto" />
        <ProfileSetup onDone={() => setJustCompletedOnboarding(true)} />
      </>
    );
  }

  if (justCompletedOnboarding) {
    return (
      <>
        <StatusBar style="auto" />
        <SummaryScreen onStart={() => setJustCompletedOnboarding(false)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <MainTabs />
    </>
  );
}
