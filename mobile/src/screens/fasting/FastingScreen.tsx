import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors } from '../../theme/useThemeColors';
import { spacing, typography } from '../../theme/theme';
import { api, apiErrorMessage } from '../../api/client';

interface FastingSession {
  id: string;
  protocol: string;
  startedAt: string;
  endedAt?: string | null;
  plannedDurationMin: number;
  pausedTotalMs: number;
  lastPausedAt?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

const PROTOCOLS = [
  { value: '16:8', label: '16:8', minutes: 16 * 60 },
  { value: '14:10', label: '14:10', minutes: 14 * 60 },
  { value: '18:6', label: '18:6', minutes: 18 * 60 },
  { value: '12:12', label: '12:12', minutes: 12 * 60 },
];

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FastingScreen() {
  const colors = useThemeColors();
  const [session, setSession] = useState<FastingSession | null>(null);
  const [history, setHistory] = useState<FastingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [protocol, setProtocol] = useState('16:8');
  const [now, setNow] = useState(Date.now());
  const [showInfo, setShowInfo] = useState(false);
  const [justCompleted, setJustCompleted] = useState<FastingSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([api.get('/fasting/active'), api.get('/fasting/history')]);
      setSession(activeRes.data);
      setHistory(historyRes.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const runAction = async (action: () => Promise<void>, errorTitle: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      Alert.alert(errorTitle, apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const start = () =>
    runAction(async () => {
      const chosen = PROTOCOLS.find((p) => p.value === protocol)!;
      const res = await api.post('/fasting/start', { protocol, plannedDurationMin: chosen.minutes });
      setSession(res.data);
    }, 'Não foi possível iniciar o jejum');

  const pause = () =>
    runAction(async () => {
      const res = await api.post(`/fasting/${session!.id}/pause`);
      setSession(res.data);
    }, 'Não foi possível pausar o jejum');

  const resume = () =>
    runAction(async () => {
      const res = await api.post(`/fasting/${session!.id}/resume`);
      setSession(res.data);
    }, 'Não foi possível retomar o jejum');

  const end = () =>
    runAction(async () => {
      const res = await api.post(`/fasting/${session!.id}/end`);
      setJustCompleted(res.data.session);
      setSession(null);
      await load();
    }, 'Não foi possível encerrar o jejum');

  const cancel = () =>
    runAction(async () => {
      await api.post(`/fasting/${session!.id}/cancel`);
      setSession(null);
      await load();
    }, 'Não foi possível cancelar o jejum');

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState emoji="⚠️" title="Não foi possível carregar o jejum" subtitle={loadError} />
          <PrimaryButton
            label="Tentar novamente"
            onPress={() => {
              setLoading(true);
              load();
            }}
          />
        </View>
      </Screen>
    );
  }

  const elapsedMs = session
    ? now - new Date(session.startedAt).getTime() - session.pausedTotalMs - (session.status === 'PAUSED' && session.lastPausedAt ? now - new Date(session.lastPausedAt).getTime() : 0)
    : 0;
  const plannedMs = (session?.plannedDurationMin || 0) * 60 * 1000;
  const endTime = session ? new Date(new Date(session.startedAt).getTime() + plannedMs) : null;

  return (
    <Screen>
      <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.lg }]}>Jejum Intermitente ⏱️</Text>

      {justCompleted && (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, alignItems: 'center' }}>
          <Text style={[typography.h3, { color: colors.primaryDark }]}>Jejum concluído! 🎉</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Duração: {formatDuration(new Date(justCompleted.endedAt!).getTime() - new Date(justCompleted.startedAt).getTime())}
          </Text>
          <Pressable onPress={() => setJustCompleted(null)} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Fechar</Text>
          </Pressable>
        </Card>
      )}

      {session ? (
        <Card style={{ alignItems: 'center', marginBottom: spacing.lg, paddingVertical: spacing.xl }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {session.status === 'PAUSED' ? 'JEJUM PAUSADO' : 'JEJUM EM ANDAMENTO'}
          </Text>
          <Text style={{ fontSize: 40, fontWeight: '700', color: colors.fasting, marginVertical: spacing.sm }}>
            {formatDuration(elapsedMs)}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: spacing.lg }}>
            <View>
              <Text style={[typography.small, { color: colors.textMuted }]}>Início</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                {new Date(session.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.small, { color: colors.textMuted }]}>Previsão de término</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                {endTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
            {session.status === 'ACTIVE' ? (
              <PrimaryButton label="PAUSAR" variant="outline" onPress={pause} disabled={submitting} style={{ flex: 1 }} />
            ) : (
              <PrimaryButton label="RETOMAR" variant="outline" onPress={resume} disabled={submitting} style={{ flex: 1 }} />
            )}
            <PrimaryButton label="ENCERRAR JEJUM" onPress={end} disabled={submitting} style={{ flex: 1 }} />
          </View>
          <Pressable onPress={cancel} disabled={submitting} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textMuted }}>Cancelar jejum</Text>
          </Pressable>
        </Card>
      ) : (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>Escolha seu protocolo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {PROTOCOLS.map((p) => (
              <Chip key={p.value} label={p.label} active={protocol === p.value} onPress={() => setProtocol(p.value)} />
            ))}
          </View>
          <PrimaryButton label="Iniciar jejum" onPress={start} loading={submitting} />
        </Card>
      )}

      <Pressable onPress={() => setShowInfo(!showInfo)} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{showInfo ? 'Ocultar informações ▲' : 'O que é o jejum intermitente? ▼'}</Text>
      </Pressable>

      {showInfo && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            O jejum intermitente alterna períodos de alimentação e de pausa alimentar. Protocolos como 16:8
            (16h em jejum, 8h de alimentação) são os mais comuns para quem está começando.
          </Text>
          <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            Durante o jejum, água, chás sem açúcar e café puro geralmente são permitidos. Comece de forma
            gradual, aumentando a janela de jejum aos poucos, e encerre com uma refeição leve.
          </Text>
          <Text style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
            Interrompa o jejum se sentir tontura, mal-estar, fraqueza intensa ou qualquer sintoma incomum.
          </Text>
          <Text style={[typography.caption, { color: colors.danger }]}>
            ⚠️ Gestantes, menores de idade, pessoas com histórico de transtornos alimentares ou com condições
            de saúde específicas devem procurar orientação profissional antes de praticar jejum. O VIDA+ não
            substitui acompanhamento médico ou nutricional.
          </Text>
        </Card>
      )}

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Histórico</Text>
      {history.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>Seus jejuns concluídos aparecerão aqui.</Text>
      ) : (
        <Card>
          {history.map((h, i) => (
            <View
              key={h.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.sm,
                borderBottomWidth: i < history.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {new Date(h.startedAt).toLocaleDateString('pt-BR')} — {h.protocol}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {h.endedAt ? formatDuration(new Date(h.endedAt).getTime() - new Date(h.startedAt).getTime()) : '—'}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
