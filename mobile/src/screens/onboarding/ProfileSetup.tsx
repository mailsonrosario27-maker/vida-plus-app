import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Screen } from '../../components/Screen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Chip } from '../../components/Chip';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useAuthStore } from '../../state/authStore';

const GOALS = [
  { value: 'LOSE_WEIGHT', label: 'Emagrecer' },
  { value: 'MAINTAIN', label: 'Manter o peso' },
  { value: 'GAIN_MUSCLE', label: 'Ganhar massa muscular' },
  { value: 'HEALTHY_HABITS', label: 'Criar hábitos saudáveis' },
];

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Sedentário' },
  { value: 'LIGHT', label: 'Leve' },
  { value: 'MODERATE', label: 'Moderado' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'VERY_ACTIVE', label: 'Muito ativo' },
];

const EXPERIENCE_LEVELS = [
  { value: 'NONE', label: 'Nenhuma' },
  { value: 'BEGINNER', label: 'Iniciante' },
  { value: 'INTERMEDIATE', label: 'Intermediária' },
  { value: 'ADVANCED', label: 'Avançada' },
];

const DIET_PREFERENCES = ['Vegetariana', 'Vegana', 'Low carb', 'Tradicional', 'Rica em proteína'];
const DIET_RESTRICTIONS = ['Sem lactose', 'Sem glúten', 'Sem açúcar', 'Nenhuma'];

interface FormState {
  name: string;
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  goal: string;
  activityLevel: string;
  wakeTime: string;
  sleepTime: string;
  dietaryPreferences: string[];
  dietaryRestrictions: string[];
  exerciseExperience: string;
  fastingExperience: string;
}

export function ProfileSetup({ onDone }: { onDone: () => void }) {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: profile?.name || '',
    age: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    goal: 'HEALTHY_HABITS',
    activityLevel: 'LIGHT',
    wakeTime: '07:00',
    sleepTime: '22:30',
    dietaryPreferences: [],
    dietaryRestrictions: [],
    exerciseExperience: 'NONE',
    fastingExperience: 'NONE',
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleArray = (key: 'dietaryPreferences' | 'dietaryRestrictions', value: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
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

  const steps = [
    {
      title: 'Sobre você',
      content: (
        <>
          <TextInput placeholder="Nome" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={(v) => update('name', v)} style={inputStyle} />
          <TextInput placeholder="Idade" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={form.age} onChangeText={(v) => update('age', v)} style={inputStyle} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['Feminino', 'Masculino', 'Prefiro não dizer'].map((s) => (
              <Chip key={s} label={s} active={form.sex === s} onPress={() => update('sex', s)} />
            ))}
          </View>
        </>
      ),
    },
    {
      title: 'Medidas',
      content: (
        <>
          <TextInput placeholder="Altura (cm)" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={form.heightCm} onChangeText={(v) => update('heightCm', v)} style={inputStyle} />
          <TextInput placeholder="Peso atual (kg)" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={form.weightKg} onChangeText={(v) => update('weightKg', v)} style={inputStyle} />
          <TextInput placeholder="Peso desejado (kg) — opcional" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={form.targetWeightKg} onChangeText={(v) => update('targetWeightKg', v)} style={inputStyle} />
        </>
      ),
    },
    {
      title: 'Seu objetivo principal',
      content: (
        <View>
          {GOALS.map((g) => (
            <Pressable
              key={g.value}
              onPress={() => update('goal', g.value)}
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: form.goal === g.value ? colors.primary : colors.border,
                backgroundColor: form.goal === g.value ? colors.primarySoft : colors.surface,
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{g.label}</Text>
            </Pressable>
          ))}
        </View>
      ),
    },
    {
      title: 'Nível de atividade física',
      content: (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {ACTIVITY_LEVELS.map((a) => (
            <Chip key={a.value} label={a.label} active={form.activityLevel === a.value} onPress={() => update('activityLevel', a.value)} />
          ))}
        </View>
      ),
    },
    {
      title: 'Sua rotina diária',
      content: (
        <>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Horário em que acorda</Text>
          <TextInput placeholder="07:00" placeholderTextColor={colors.textMuted} value={form.wakeTime} onChangeText={(v) => update('wakeTime', v)} style={inputStyle} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Horário em que dorme</Text>
          <TextInput placeholder="22:30" placeholderTextColor={colors.textMuted} value={form.sleepTime} onChangeText={(v) => update('sleepTime', v)} style={inputStyle} />
        </>
      ),
    },
    {
      title: 'Preferências alimentares',
      content: (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DIET_PREFERENCES.map((p) => (
            <Chip key={p} label={p} active={form.dietaryPreferences.includes(p)} onPress={() => toggleArray('dietaryPreferences', p)} />
          ))}
        </View>
      ),
    },
    {
      title: 'Restrições alimentares',
      content: (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DIET_RESTRICTIONS.map((r) => (
            <Chip key={r} label={r} active={form.dietaryRestrictions.includes(r)} onPress={() => toggleArray('dietaryRestrictions', r)} />
          ))}
        </View>
      ),
    },
    {
      title: 'Experiência com exercícios e jejum',
      content: (
        <>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Exercícios</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
            {EXPERIENCE_LEVELS.map((e) => (
              <Chip key={e.value} label={e.label} active={form.exerciseExperience === e.value} onPress={() => update('exerciseExperience', e.value)} />
            ))}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Jejum intermitente</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {EXPERIENCE_LEVELS.map((e) => (
              <Chip key={e.value} label={e.label} active={form.fastingExperience === e.value} onPress={() => update('fastingExperience', e.value)} />
            ))}
          </View>
        </>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/profile/complete-onboarding', {
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        sex: form.sex || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
        goal: form.goal,
        activityLevel: form.activityLevel,
        wakeTime: form.wakeTime,
        sleepTime: form.sleepTime,
        dietaryPreferences: form.dietaryPreferences,
        dietaryRestrictions: form.dietaryRestrictions,
        exerciseExperience: form.exerciseExperience,
        fastingExperience: form.fastingExperience,
      });
      await useAuthStore.getState().refreshMe();
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: radius.pill,
              backgroundColor: i <= step ? colors.primary : colors.border,
              marginRight: i < steps.length - 1 ? 4 : 0,
            }}
          />
        ))}
      </View>

      <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.lg }]}>{steps[step].title}</Text>

      {steps[step].content}

      {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.md }]}>{error}</Text> : null}

      <View style={{ flexDirection: 'row', marginTop: spacing.xl, gap: spacing.sm }}>
        {step > 0 && (
          <PrimaryButton label="Voltar" variant="outline" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
        )}
        <PrimaryButton
          label={isLast ? 'Concluir' : 'Continuar'}
          onPress={isLast ? submit : () => setStep((s) => s + 1)}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
