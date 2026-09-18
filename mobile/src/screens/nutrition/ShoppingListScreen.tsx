import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface Item {
  id: string;
  name: string;
  quantity?: string | null;
  checked: boolean;
}

export function ShoppingListScreen() {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/recipes/shopping-list/mine')
      .then((res) => {
        setItems(res.data);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (item: Item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    try {
      await api.patch(`/recipes/shopping-list/${item.id}`, { checked: !item.checked });
    } catch (err) {
      Alert.alert('Não foi possível atualizar o item', apiErrorMessage(err));
      load();
    }
  };

  const remove = async (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await api.delete(`/recipes/shopping-list/${item.id}`);
    } catch (err) {
      Alert.alert('Não foi possível remover o item', apiErrorMessage(err));
      load();
    }
  };

  return (
    <Screen>
      <Pressable onPress={pop} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted }}>{'‹ Voltar'}</Text>
      </Pressable>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Lista de compras 🛒</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Gerada automaticamente a partir dos ingredientes das receitas que você adicionou.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : loadError ? (
        <View style={{ alignItems: 'center' }}>
          <EmptyState emoji="⚠️" title="Não foi possível carregar a lista" subtitle={loadError} />
          <PrimaryButton label="Tentar novamente" onPress={load} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState emoji="🛒" title="Sua lista está vazia" subtitle="Adicione receitas ao seu dia para gerar a lista automaticamente." />
      ) : (
        <Card>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderBottomWidth: i < items.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Pressable onPress={() => toggle(item)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: spacing.sm }}>{item.checked ? '✅' : '⬜️'}</Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textPrimary, textDecorationLine: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.5 : 1 },
                  ]}
                >
                  {item.name}{item.quantity ? ` — ${item.quantity}` : ''}
                </Text>
              </Pressable>
              <Pressable onPress={() => remove(item)}>
                <Text style={{ color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
