import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Pill, SectionTitle } from '@/components/primitives';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type Notification = {
  id: string | number;
  titulo?: string;
  titulo_notificacao?: string;
  mensagem?: string;
  mensagem_notificacao?: string;
  criada_em?: string;
  data_criacao?: string;
  lida?: boolean;
  type?: string;
  action_url?: string;
};

export function NotificationsScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const data = await request<{ notificacoes: Notification[] }>('/api/notifications');
      setNotifications(data.notificacoes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function markRead(n: Notification) {
    if (n.lida) return;
    try {
      await request(`/api/notifications/${n.id}/read`, { method: 'PUT' });
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    } catch {
      // ignore
    }
  }

  function handleAction(n: Notification) {
    markRead(n);
    if (n.action_url) {
      Linking.openURL(n.action_url).catch(() => {});
    }
  }

  const unread = notifications.filter((n) => !n.lida).length;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <SectionTitle
        kicker="Alertas"
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && notifications.length === 0 ? (
        <EmptyState title="Sem notificações" body="Aqui aparecerão alertas de manutenção e novidades." />
      ) : null}

      {notifications.map((n) => (
        <Pressable key={n.id} onPress={() => handleAction(n)} style={[styles.card, !n.lida ? styles.cardUnread : null]}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={n.type === 'maintenance' ? 'time' : n.action_url ? 'open' : 'notifications'}
              size={18}
              color={!n.lida ? Palette.primary : Palette.textMuted}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{n.titulo || n.titulo_notificacao || 'Notificação'}</Text>
            <Text style={styles.body} numberOfLines={3}>{n.mensagem || n.mensagem_notificacao || ''}</Text>
            <Text style={styles.date}>{formatDate(n.criada_em || n.data_criacao)}</Text>
          </View>
          {!n.lida && <View style={styles.dot} />}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
  error: { color: Palette.red, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  cardUnread: { borderColor: `${Palette.primary}40`, backgroundColor: Palette.primaryMuted },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Palette.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.one },
  title: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  body: { color: Palette.textMuted, fontSize: 13, lineHeight: 18 },
  date: { color: Palette.textSoft, fontSize: 11 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: Palette.primary,
    marginTop: 4,
  },
});
