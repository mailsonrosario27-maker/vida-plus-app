import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Switch, Alert } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useAuthStore } from '../../state/authStore';
import { useUiStore } from '../../state/uiStore';
import { useNavigationStore } from '../../state/navigationStore';
import { syncLocalReminders } from '../../utils/notifications';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Emagrecer',
  MAINTAIN: 'Manter o peso',
  GAIN_MUSCLE: 'Ganhar massa muscular',
  HEALTHY_HABITS: 'Hábitos saudáveis',
};

interface NotificationPrefs {
  waterReminders: boolean;
  mealReminders: boolean;
  exerciseReminders: boolean;
  fastingReminders: boolean;
  windDownReminders: boolean;
}

function SectionHeader({ title }: { title: string }) {
  const colors = useThemeColors();
  return <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.lg }]}>{title}</Text>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }}>
      <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

export function ProfileScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const subscription = useAuthStore((s) => s.subscription);
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const darkMode = useUiStore((s) => s.darkMode);
  const setDarkMode = useUiStore((s) => s.setDarkMode);
  const push = useNavigationStore((s) => s.push);

  const [editing, setEditing] = useState(false);
  const [weightKg, setWeightKg] = useState(String(profile?.weightKg ?? ''));
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile?.targetWeightKg ?? ''));
  const [waterGoalMl, setWaterGoalMl] = useState(String(profile?.waterGoalMl ?? 2000));
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    api.get('/profile/notifications').then((res) => setNotifPrefs(res.data));
  }, []);

  const saveProfile = async () => {
    try {
      await api.put('/profile', {
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        waterGoalMl: waterGoalMl ? Number(waterGoalMl) : undefined,
      });
      await useAuthStore.getState().refreshMe();
      setEditing(false);
    } catch (err) {
      Alert.alert('Não foi possível salvar', apiErrorMessage(err));
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    const previous = darkMode;
    setDarkMode(value);
    try {
      await api.put('/profile', { darkMode: value });
    } catch (err) {
      setDarkMode(previous);
      Alert.alert('Não foi possível salvar', apiErrorMessage(err));
    }
  };

  const updateNotifPref = async (key: keyof NotificationPrefs, value: boolean) => {
    const previous = notifPrefs;
    setNotifPrefs((p) => (p ? { ...p, [key]: value } : p));
    try {
      const res = await api.put('/profile/notifications', { [key]: value });
      syncLocalReminders(res.data, profile?.wakeTime ?? undefined, profile?.sleepTime ?? undefined);
    } catch (err) {
      setNotifPrefs(previous);
      Alert.alert('Não foi possível salvar', apiErrorMessage(err));
    }
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      await logout();
    } catch {
      Alert.alert('Não foi possível excluir a conta', 'Verifique sua senha e tente novamente.');
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 28 }}>{profile?.name?.[0]?.toUpperCase() || '🙂'}</Text>
        </View>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{profile?.name}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{email}</Text>
      </View>

      <Pressable onPress={() => push({ name: 'assistant' })}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Text style={{ fontSize: 22, marginRight: spacing.sm }}>🤖</Text>
          <Text style={[typography.bodyBold, { color: colors.primaryDark, flex: 1 }]}>Falar com o Assistente VIDA+</Text>
          <Text style={{ color: colors.primaryDark }}>›</Text>
        </Card>
      </Pressable>

      <Pressable onPress={() => push({ name: 'paywall' })}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontSize: 22, marginRight: spacing.sm }}>{subscription?.plan === 'PREMIUM' ? '👑' : '✨'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              Assinatura {subscription?.plan === 'PREMIUM' ? 'Premium' : 'Gratuita'}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {subscription?.plan === 'PREMIUM' ? 'Todos os recursos liberados' : 'Toque para conhecer o Premium'}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted }}>›</Text>
        </Card>
      </Pressable>

      <SectionHeader title="Meus objetivos" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Objetivo</Text>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{GOAL_LABELS[profile?.goal || 'HEALTHY_HABITS']}</Text>
        </View>

        {editing ? (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Peso atual (kg)</Text>
            <TextInput value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" style={inputStyle(colors)} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Peso desejado (kg)</Text>
            <TextInput value={targetWeightKg} onChangeText={setTargetWeightKg} keyboardType="decimal-pad" style={inputStyle(colors)} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Meta de água (ml)</Text>
            <TextInput value={waterGoalMl} onChangeText={setWaterGoalMl} keyboardType="number-pad" style={inputStyle(colors)} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <PrimaryButton label="Cancelar" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <PrimaryButton label="Salvar" onPress={saveProfile} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Peso atual</Text>
              <Text style={[typography.body, { color: colors.textPrimary }]}>{profile?.weightKg ? `${profile.weightKg} kg` : '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Meta de água</Text>
              <Text style={[typography.body, { color: colors.textPrimary }]}>{((profile?.waterGoalMl || 2000) / 1000).toFixed(1)}L</Text>
            </View>
            <Pressable onPress={() => setEditing(true)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Editar</Text>
            </Pressable>
          </>
        )}
      </Card>

      <SectionHeader title="Notificações" />
      <Card>
        {notifPrefs ? (
          <>
            <ToggleRow label="💧 Lembretes de água" value={notifPrefs.waterReminders} onChange={(v) => updateNotifPref('waterReminders', v)} />
            <ToggleRow label="🍽️ Lembretes de refeição" value={notifPrefs.mealReminders} onChange={(v) => updateNotifPref('mealReminders', v)} />
            <ToggleRow label="🏃 Lembretes de exercício" value={notifPrefs.exerciseReminders} onChange={(v) => updateNotifPref('exerciseReminders', v)} />
            <ToggleRow label="⏱️ Lembretes de jejum" value={notifPrefs.fastingReminders} onChange={(v) => updateNotifPref('fastingReminders', v)} />
            <ToggleRow label="🌙 Preparação para dormir" value={notifPrefs.windDownReminders} onChange={(v) => updateNotifPref('windDownReminders', v)} />
          </>
        ) : (
          <Text style={{ color: colors.textMuted }}>Carregando...</Text>
        )}
      </Card>

      <SectionHeader title="Aparência" />
      <Card>
        <ToggleRow label="🌙 Modo escuro" value={darkMode} onChange={toggleDarkMode} />
      </Card>

      <SectionHeader title="Privacidade e conta" />
      <Card>
        <Pressable onPress={() => setShowPrivacy(!showPrivacy)}>
          <Text style={[typography.body, { color: colors.primary, fontWeight: '700', marginBottom: showPrivacy ? spacing.sm : 0 }]}>
            {showPrivacy ? 'Ocultar política de privacidade ▲' : 'Ver política de privacidade e termos ▼'}
          </Text>
        </Pressable>
        {showPrivacy && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Seus dados pessoais e de saúde são usados apenas para personalizar sua experiência no VIDA+ e não
            são vendidos a terceiros. Em conformidade com a LGPD, você pode solicitar a exportação ou exclusão
            completa dos seus dados a qualquer momento. As informações do app têm caráter educativo e não
            substituem diagnóstico, tratamento ou acompanhamento profissional de saúde.
          </Text>
        )}

        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 }]}>
          Excluir conta permanentemente
        </Text>
        <TextInput
          placeholder="Confirme sua senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={deletePassword}
          onChangeText={setDeletePassword}
          style={inputStyle(colors)}
        />
        <PrimaryButton
          label="Excluir minha conta e meus dados"
          variant="outline"
          disabled={!deletePassword}
          onPress={() =>
            Alert.alert('Excluir conta', 'Esta ação é permanente e removerá todos os seus dados. Deseja continuar?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: deleteAccount },
            ])
          }
        />
      </Card>

      <PrimaryButton label="Sair" variant="ghost" onPress={logout} style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}

function inputStyle(colors: ReturnType<typeof useThemeColors>) {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  };
}
