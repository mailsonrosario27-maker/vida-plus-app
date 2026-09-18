import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface Recipe {
  id: string;
  title: string;
  category: string;
  period: string;
  description: string;
  imageUrl?: string | null;
  prepTimeMin: number;
  difficulty: string;
  calories?: number | null;
  tags: string[];
}

const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'BREAKFAST', label: 'Café da manhã' },
  { value: 'LUNCH', label: 'Almoço' },
  { value: 'DINNER', label: 'Jantar' },
  { value: 'SNACK', label: 'Lanches' },
  { value: 'DESSERT', label: 'Sobremesas' },
  { value: 'DRINK', label: 'Bebidas' },
];

const FILTER_TAGS = ['rapido', 'economico', 'vegetariano', 'rico-em-proteina', 'sem-lactose', 'sem-gluten'];

function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} style={{ marginBottom: spacing.md }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ height: 110, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text style={{ fontSize: 36 }}>🍽️</Text>
          )}
        </View>
        <View style={{ padding: spacing.md }}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{recipe.title}</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
            {recipe.description}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>⏱ {recipe.prepTimeMin} min</Text>
            {recipe.calories ? (
              <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.md }]}>🔥 {recipe.calories} kcal</Text>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function NutritionScreen() {
  const colors = useThemeColors();
  const push = useNavigationStore((s) => s.push);
  const [subTab, setSubTab] = useState<'menu' | 'recipes'>('menu');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (tag) params.tag = tag;
    api
      .get('/recipes', { params })
      .then((res) => setRecipes(res.data))
      .finally(() => setLoading(false));
  }, [category, tag]);

  const periods: { key: string; label: string; emoji: string }[] = [
    { key: 'MORNING', label: 'Manhã', emoji: '☀️' },
    { key: 'AFTERNOON', label: 'Tarde', emoji: '🌤️' },
    { key: 'NIGHT', label: 'Noite', emoji: '🌙' },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{subTab === 'menu' ? 'Meu Cardápio' : 'Receitas'}</Text>
        <Pressable onPress={() => push({ name: 'shoppingList' })}>
          <Text style={{ fontSize: 22 }}>🛒</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: spacing.lg, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
        {(['menu', 'recipes'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setSubTab(t)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.pill,
              backgroundColor: subTab === t ? colors.surface : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: subTab === t ? colors.primary : colors.textMuted, fontWeight: '700' }}>
              {t === 'menu' ? 'Cardápio' : 'Biblioteca de receitas'}
            </Text>
          </Pressable>
        ))}
      </View>

      {subTab === 'recipes' && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
            {CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
            {FILTER_TAGS.map((t) => (
              <Chip key={t} label={t.replace(/-/g, ' ')} active={tag === t} onPress={() => setTag(tag === t ? '' : t)} />
            ))}
          </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : subTab === 'recipes' ? (
        recipes.length === 0 ? (
          <EmptyState emoji="🥗" title="Nenhuma receita encontrada" subtitle="Tente outro filtro." />
        ) : (
          recipes.map((r) => <RecipeCard key={r.id} recipe={r} onPress={() => push({ name: 'recipeDetail', recipeId: r.id })} />)
        )
      ) : (
        periods.map((period) => {
          const items = recipes.filter((r) => r.period === period.key || r.period === 'ANY');
          return (
            <View key={period.key} style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
                {period.emoji} {period.label.toUpperCase()}
              </Text>
              {items.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>Nenhuma sugestão por aqui ainda.</Text>
              ) : (
                items.slice(0, 3).map((r) => <RecipeCard key={r.id} recipe={r} onPress={() => push({ name: 'recipeDetail', recipeId: r.id })} />)
              )}
            </View>
          );
        })
      )}
    </Screen>
  );
}
