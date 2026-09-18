import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Screen } from '../../components/Screen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { useAuthStore } from '../../state/authStore';

export function AuthScreen({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    clearError();
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email.trim().toLowerCase(), password, name.trim());
      } else {
        await login(email.trim().toLowerCase(), password);
      }
    } catch {
      // erro já exposto via authStore.error
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  };

  return (
    <Screen>
      <Pressable onPress={onBack} style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
      </Pressable>

      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        {mode === 'register' ? 'Crie sua conta' : 'Bem-vinda(o) de volta'}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
        {mode === 'register'
          ? 'Leva menos de um minuto para começar sua rotina VIDA+.'
          : 'Entre para continuar sua rotina saudável.'}
      </Text>

      {mode === 'register' && (
        <TextInput placeholder="Seu nome" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={inputStyle} />
      )}
      <TextInput
        placeholder="E-mail"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />
      <TextInput
        placeholder="Senha"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />

      {error ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{error}</Text>
      ) : null}

      <PrimaryButton
        label={mode === 'register' ? 'Criar conta' : 'Entrar'}
        onPress={submit}
        loading={loading}
        disabled={!email || !password || (mode === 'register' && !name)}
      />

      <Pressable
        onPress={() => {
          clearError();
          setMode(mode === 'register' ? 'login' : 'register');
        }}
        style={{ marginTop: spacing.lg, alignItems: 'center' }}
      >
        <Text style={{ color: colors.textSecondary }}>
          {mode === 'register' ? 'Já tem conta? ' : 'Ainda não tem conta? '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{mode === 'register' ? 'Entrar' : 'Criar conta'}</Text>
        </Text>
      </Pressable>

      <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' }]}>
        As informações do seu perfil são usadas apenas para personalizar sua experiência e têm caráter
        educativo — não substituem acompanhamento médico ou nutricional profissional.
      </Text>
    </Screen>
  );
}
