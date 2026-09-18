import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography, radius } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';
import { useNavigationStore } from '../../state/navigationStore';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

const SUGGESTIONS = [
  'Estou com fome, o que posso comer?',
  'Me dê uma opção de jantar saudável.',
  'Hoje não consegui treinar. O que posso fazer?',
  'Esqueci de beber água hoje.',
];

export function AssistantScreen() {
  const colors = useThemeColors();
  const pop = useNavigationStore((s) => s.pop);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = () => {
    setLoading(true);
    api
      .get('/ai/history')
      .then((res) => {
        setMessages(res.data);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(loadHistory, []);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setSendError(null);
    setInput('');
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'USER', content: text }]);
    try {
      const res = await api.post('/ai/chat', { message: text });
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      setSendError(apiErrorMessage(err));
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={pop} style={{ marginRight: spacing.md }}>
          <Text style={{ color: colors.textMuted }}>{'‹'}</Text>
        </Pressable>
        <Text style={{ fontSize: 22, marginRight: spacing.sm }}>🤖</Text>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>Assistente VIDA+</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : loadError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState emoji="⚠️" title="Não foi possível carregar a conversa" subtitle={loadError} />
          <PrimaryButton label="Tentar novamente" onPress={loadHistory} />
        </View>
      ) : (
        <ScrollView ref={scrollRef} style={{ flex: 1, paddingHorizontal: spacing.lg }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.length === 0 && (
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              Oi! Sou o Assistente VIDA+. Posso ajudar a organizar sua alimentação, água, jejum e exercícios de
              hoje. Não substituo acompanhamento médico ou nutricional — para questões de saúde específicas,
              procure um profissional.
            </Text>
          )}
          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                alignSelf: m.role === 'USER' ? 'flex-end' : 'flex-start',
                backgroundColor: m.role === 'USER' ? colors.primary : colors.surfaceAlt,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                maxWidth: '85%',
              }}
            >
              <Text style={{ color: m.role === 'USER' ? '#FFFFFF' : colors.textPrimary }}>{m.content}</Text>
            </View>
          ))}
          {sending && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />}
        </ScrollView>
      )}

      {messages.length === 0 && !loading && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => send(s)}
              style={{ backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: spacing.md, marginRight: spacing.sm, marginBottom: spacing.sm }}
            >
              <Text style={{ color: colors.primaryDark, fontSize: 12 }}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {sendError ? (
        <Text style={[typography.caption, { color: colors.danger, paddingHorizontal: spacing.lg, marginBottom: 4 }]}>
          {sendError}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', padding: spacing.lg, alignItems: 'center' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escreva sua mensagem..."
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            color: colors.textPrimary,
            marginRight: spacing.sm,
          }}
          onSubmitEditing={() => send(input)}
        />
        <Pressable
          onPress={() => send(input)}
          style={{ backgroundColor: colors.primary, borderRadius: radius.pill, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18 }}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
