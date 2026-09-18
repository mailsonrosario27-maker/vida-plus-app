import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface RecipeDetail {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  ingredients: { name: string; quantity?: string }[];
  steps: string[];
  prepTimeMin: number;
  difficulty: string;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  bestTime?: string | null;
  cautions?: string | null;
}

const DIFFICULTY_LABEL: Record<string, string> = { EASY: 'Fácil', MEDIUM: 'Médio', HARD: 'Difícil' };

export function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [addedToday, setAddedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setAddedToday(false);
    api
      .get(`/recipes/${recipeId}`)
      .then((res) => {
        setRecipe(res.data);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [recipeId]);

  const toggleFavorite = async () => {
    try {
      if (favorite) {
        await api.delete(`/recipes/${recipeId}/favorite`);
      } else {
        await api.post(`/recipes/${recipeId}/favorite`);
      }
      setFavorite(!favorite);
    } catch (err) {
      Alert.alert('Não foi possível atualizar os favoritos', apiErrorMessage(err));
    }
  };

  const addToDay = async () => {
    try {
      await api.post('/meals', { recipeId, period: 'ANY' });
      setAddedToday(true);
    } catch (err) {
      Alert.alert('Não foi possível adicionar ao seu dia', apiErrorMessage(err));
    }
  };

  const showAnotherOption = async () => {
    try {
      const res = await api.get(`/recipes/${recipeId}/alternatives`);
      if (res.data.length > 0) {
        const alt = res.data[Math.floor(Math.random() * res.data.length)];
        pop();
        useNavigationStore.getState().push({ name: 'recipeDetail', recipeId: alt.id });
      }
    } catch (err) {
      Alert.alert('Não foi possível buscar outra opção', apiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError || !recipe) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState emoji="⚠️" title="Não foi possível carregar a receita" subtitle={loadError ?? undefined} />
          <PrimaryButton label="Voltar" onPress={pop} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Pressable onPress={pop}>
          <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
        </Pressable>
        <Pressable onPress={toggleFavorite}>
          <Text style={{ fontSize: 20 }}>{favorite ? '❤️' : '🤍'}</Text>
        </Pressable>
      </View>

      <View style={{ height: 160, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, overflow: 'hidden' }}>
        {recipe.imageUrl ? <Image source={{ uri: recipe.imageUrl }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 48 }}>🍽️</Text>}
      </View>

      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xs }]}>{recipe.title}</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>{recipe.description}</Text>

      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>⏱ {recipe.prepTimeMin} min</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginLeft: spacing.md }]}>📶 {DIFFICULTY_LABEL[recipe.difficulty]}</Text>
        {recipe.bestTime ? <Text style={[typography.caption, { color: colors.textMuted, marginLeft: spacing.md }]}>🕐 {recipe.bestTime}</Text> : null}
      </View>

      {(recipe.calories || recipe.proteinG) && (
        <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-around' }}>
          {recipe.calories ? <NutrientStat label="kcal" value={recipe.calories} /> : null}
          {recipe.proteinG ? <NutrientStat label="proteína" value={`${recipe.proteinG}g`} /> : null}
          {recipe.carbsG ? <NutrientStat label="carbo" value={`${recipe.carbsG}g`} /> : null}
          {recipe.fatG ? <NutrientStat label="gordura" value={`${recipe.fatG}g`} /> : null}
        </Card>
      )}

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Ingredientes</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {recipe.ingredients.map((ing, i) => (
          <Text key={i} style={[typography.body, { color: colors.textPrimary, marginBottom: i < recipe.ingredients.length - 1 ? spacing.xs : 0 }]}>
            • {ing.name}{ing.quantity ? ` — ${ing.quantity}` : ''}
          </Text>
        ))}
      </Card>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Modo de preparo</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {recipe.steps.map((step, i) => (
          <Text key={i} style={[typography.body, { color: colors.textPrimary, marginBottom: i < recipe.steps.length - 1 ? spacing.sm : 0 }]}>
            {i + 1}. {step}
          </Text>
        ))}
      </Card>

      {recipe.cautions ? (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.accentWarmSoft, borderColor: colors.accentWarmSoft }}>
          <Text style={[typography.caption, { color: colors.textPrimary }]}>⚠️ {recipe.cautions}</Text>
        </Card>
      ) : null}

      <PrimaryButton label={addedToday ? 'Adicionado ao seu dia ✓' : 'Adicionar ao meu dia'} onPress={addToDay} disabled={addedToday} />

      <Pressable onPress={showAnotherOption} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Não gostou desta opção?</Text>
        <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>VER OUTRA REFEIÇÃO</Text>
      </Pressable>
    </Screen>
  );
}

function NutrientStat({ label, value }: { label: string; value: string | number }) {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[typography.small, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}
