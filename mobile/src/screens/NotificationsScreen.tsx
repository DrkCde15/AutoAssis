import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/auth';
import type { AppTab } from './AppShell';

type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_TONE: Record<string, 'info' | 'good' | 'warn' | 'danger' | 'neutral'> = {
  info: 'info',
  success: 'good',
  warning: 'warn',
  error: 'danger',
  alert: 'danger',
};

export function NotificationsScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<AppNotification[]>('/api/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar notificacoes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await request(`/api/notifications/${id}/read`, { method: 'POST' });
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      } catch {
        /* silencioso */
      }
    },
    [request],
  );

  const markAll = useCallback(async () => {
    try {
      await request('/api/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Nao foi possivel marcar todas.');
    }
  }, [request]);

  const remove = useCallback(
    async (id: number) => {
      try {
        await request(`/api/notifications/${id}`, { method: 'DELETE' });
        setItems((prev) => prev.filter((n) => n.id !== id));
      } catch {
        /* silencioso */
      }
    },
    [request],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.primary} />
      </View>
    );
  }

  if (error) {
    return <EmptyState title="Erro" message={error} action={{ label: 'Tentar de novo', onPress: load }} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma notificacao"
        message="Voce nao tem alertas por aqui ainda."
        action={{ label: 'Atualizar', onPress: load }}
      />
    );
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notificacoes</Text>
        {unread > 0 && <Pill tone="info">{unread} nova(s)</Pill>}
      </View>
      {unread > 0 && (
        <AppButton variant="secondary" onPress={markAll}>
          Marcar todas como lidas
        </AppButton>
      )}

      {items.map((n) => (
        <Card key={n.id}>
          <View style={styles.rowBetween}>
            <Pill tone={TYPE_TONE[n.type] || 'neutral'}>{n.type || 'info'}</Pill>
            {!n.is_read && <View style={styles.dot} />}
          </View>
          <Text style={styles.notifTitle}>{n.title}</Text>
          {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
          <Text style={styles.time}>{formatDate(n.created_at)}</Text>
          <View style={styles.actions}>
            {!n.is_read && (
              <Pressable onPress={() => markRead(n.id)} style={styles.link}>
                <Text style={styles.linkText}>Marcar como lida</Text>
              </Pressable>
            )}
            <Pressable onPress={() => remove(n.id)} style={styles.link}>
              <Text style={[styles.linkText, styles.danger]}>Remover</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <AppButton variant="ghost" onPress={() => goTo('home')}>
        Voltar ao inicio
      </AppButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  container: { padding: Spacing.four, gap: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Palette.text, fontSize: 22, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.blue },
  notifTitle: { color: Palette.text, fontSize: 16, fontWeight: '600', marginTop: Spacing.two },
  body: { color: Palette.textMuted, fontSize: 14, marginTop: Spacing.one },
  time: { color: Palette.textSoft, fontSize: 12, marginTop: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
  link: { paddingVertical: 4 },
  linkText: { color: Palette.primary, fontSize: 14, fontWeight: '600' },
  danger: { color: Palette.red },
});
