import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton, Card, EmptyState, Field, Pill, SectionTitle } from '@/components/primitives';
import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate, formatKm } from '@/lib/format';
import type { MaintenanceAlert, MaintenanceRecord, MaintenanceSummary } from '@/lib/types';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

type Tab = 'proximas' | 'atrasadas' | 'concluidas';

export function MaintenanceScreen({ nav }: { nav: Nav }) {
  const { user, request, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>('proximas');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [premiumBlocked, setPremiumBlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    setMessage('');
    try {
      const [historyData, alertsData] = await Promise.all([
        request<{ historico: MaintenanceRecord[]; resumo: MaintenanceSummary }>('/api/maintenance/history'),
        request<{ alertas: MaintenanceAlert[] }>('/api/maintenance/alerts'),
      ]);
      setHistory(historyData.historico || []);
      setSummary(historyData.resumo || null);
      setAlerts(alertsData.alertas || []);
      setPremiumBlocked(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setPremiumBlocked(true);
      } else {
        setMessage(error instanceof Error ? error.message : 'Erro ao carregar manutenções.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, user?.is_premium]);

  const locked = premiumBlocked || !user?.is_premium;

  useEffect(() => {
    if (locked) return;
    let active = true;
    void (async () => {
      try {
        const data = await request<{ enabled: boolean }>('/api/maintenance/email-settings');
        if (active) setEmailEnabled(!!data.enabled);
      } catch {
        if (active) setEmailEnabled(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [request, locked]);

  async function toggleEmail(value: boolean) {
    setEmailLoading(true);
    setEmailMsg('');
    try {
      await request('/api/maintenance/email-settings', { method: 'PUT', body: { enabled: value } });
      setEmailEnabled(value);
    } catch (error) {
      setEmailMsg(error instanceof Error ? error.message : 'Erro ao salvar preferência.');
    } finally {
      setEmailLoading(false);
    }
  }

  async function sendEmailNow() {
    setEmailLoading(true);
    setEmailMsg('');
    try {
      const data = await request<{ success: boolean; reason?: string }>('/api/maintenance/email/send-now', {
        method: 'POST',
      });
      setEmailMsg(data.reason || (data.success ? 'E-mail enviado.' : 'Nada a enviar agora.'));
    } catch (error) {
      setEmailMsg(error instanceof Error ? error.message : 'Erro ao enviar e-mail.');
    } finally {
      setEmailLoading(false);
    }
  }

  async function saveMaintenance() {
    if (!description.trim()) {
      setMessage('Descreva a manutenção realizada.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await request('/api/maintenance/history', { method: 'POST', body: { descricao: description.trim() } });
      setDescription('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar manutenção.');
    } finally {
      setSaving(false);
    }
  }

  async function openCheckout() {
    setMessage('');
    try {
      const data = await request<{ checkout_url?: string; data?: { checkout_url?: string } }>('/api/pay/preference', {
        method: 'POST',
        body: {},
      });
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      if (!checkoutUrl) {
        setMessage('Checkout premium não configurado.');
        return;
      }
      await Linking.openURL(checkoutUrl);
      await refreshUser();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o checkout.');
    }
  }

  function toneFromAlert(alert: MaintenanceAlert): 'neutral' | 'good' | 'warn' | 'danger' | 'info' {
    const code = String(alert.status_code || alert.status || '').toLowerCase();
    if (code.includes('overdue') || code.includes('atras') || code.includes('critical')) return 'danger';
    if (code.includes('warning') || code.includes('avis')) return 'warn';
    return 'info';
  }

  const proximas = alerts.filter((a) => !/atras|overdue|conclu|done|ok/i.test(a.status_code || a.status || ''));
  const atrasadas = alerts.filter((a) => /atras|overdue/i.test(a.status_code || a.status || ''));

  if (locked) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Card style={styles.lockedCard}>
          <Pill label="Premium" tone="info" />
          <SectionTitle title="Histórico e alertas premium" />
          <Text style={styles.muted}>
            As anotações de manutenção liberam previsão de vencimento, alertas e resumo de gastos.
          </Text>
          <View style={styles.actions}>
            <AppButton title="Ativar Premium" onPress={openCheckout} />
            <AppButton title="Perguntar à NOG" variant="ghost" onPress={() => nav.goTo('chat')} />
          </View>
          {message ? <Text style={styles.error}>{message}</Text> : null}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Card style={styles.form}>
        <SectionTitle title="Registrar manutenção" />
        <Text style={styles.muted}>
          Escreva de forma natural, por exemplo: troquei o óleo hoje com 65000 km por 280 reais.
        </Text>
        <Field
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Troquei pastilhas de freio..."
          style={styles.description}
        />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <AppButton title="Salvar" onPress={saveMaintenance} loading={saving} />
      </Card>

      <Card style={styles.emailCard}>
        <SectionTitle title="Lembretes por e-mail" />
        <Text style={styles.muted}>Receba alertas de manutenção vencendo no seu e-mail.</Text>
        <View style={styles.emailRow}>
          <Text style={styles.emailLabel}>Ativar lembretes</Text>
          <Switch
            value={!!emailEnabled}
            onValueChange={toggleEmail}
            disabled={emailLoading || emailEnabled === null}
            thumbColor={Palette.white}
            trackColor={{ false: Palette.bgAlt, true: Palette.primary }}
          />
        </View>
        {emailEnabled ? (
          <AppButton title="Enviar agora" variant="secondary" onPress={sendEmailNow} loading={emailLoading} />
        ) : null}
        {emailMsg ? <Text style={styles.error}>{emailMsg}</Text> : null}
      </Card>

      <View style={styles.grid}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{history.length}</Text>
          <Text style={styles.statLabel}>Registros</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{formatCurrency(summary?.total_gasto ?? summary?.total_cost ?? 0)}</Text>
          <Text style={styles.statLabel}>Gastos</Text>
        </Card>
      </View>

      <View style={styles.tabs}>
        <TabButton label="Próximas" count={proximas.length} active={tab === 'proximas'} onPress={() => setTab('proximas')} />
        <TabButton label="Atrasadas" count={atrasadas.length} active={tab === 'atrasadas'} onPress={() => setTab('atrasadas')} danger={atrasadas.length > 0} />
        <TabButton label="Concluídas" count={history.length} active={tab === 'concluidas'} onPress={() => setTab('concluidas')} />
      </View>

      {tab !== 'concluidas' && (tab === 'atrasadas' ? atrasadas.length : proximas.length) ? (
        (tab === 'atrasadas' ? atrasadas : proximas).map((alert, index) => (
          <Card key={`${alert.id || index}`} style={styles.card}>
            <View style={styles.row}>
              <Pill tone={tab === 'atrasadas' ? 'danger' : toneFromAlert(alert)} label={alert.status_label || alert.status || 'Status'} />
            </View>
            <Text style={styles.itemTitle}>{alert.maintenance_label || 'Manutenção'}</Text>
            <Text style={styles.muted}>{alert.message || `${formatDate(alert.next_due_date)} · ${formatKm(alert.next_due_km)}`}</Text>
          </Card>
        ))
      ) : null}

      {tab === 'concluidas' && history.length ? (
        history.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.itemTitle}>{item.maintenance_label || 'Manutenção geral'}</Text>
            <Text style={styles.muted}>{item.description || '-'}</Text>
            <Text style={styles.muted}>
              {formatDate(item.service_date)} · {formatKm(item.service_km)} · {formatCurrency(item.cost, item.currency)}
            </Text>
          </Card>
        ))
      ) : null}

      {(tab === 'concluidas' ? history.length : tab === 'atrasadas' ? atrasadas.length : proximas.length) === 0 ? (
        <EmptyState
          title={tab === 'concluidas' ? 'Sem anotações' : tab === 'atrasadas' ? 'Nada atrasado' : 'Nada pendente'}
          body="Registre a primeira manutenção para iniciar o histórico."
        />
      ) : null}
    </ScrollView>
  );
}

function TabButton({
  label,
  count,
  active,
  danger,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableTab active={active} danger={danger} onPress={onPress}>
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
      <View style={[styles.tabCount, danger ? styles.tabCountDanger : null, active ? styles.tabCountActive : null]}>
        <Text style={styles.tabCountText}>{count}</Text>
      </View>
    </PressableTab>
  );
}

function PressableTab({
  active,
  danger,
  onPress,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        active ? styles.tabActive : null,
        danger && !active ? styles.tabDanger : null,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  lockedCard: { gap: Spacing.three },
  muted: { color: Palette.textMuted, lineHeight: 18, fontSize: 13 },
  actions: { gap: Spacing.two },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },
  form: { gap: Spacing.three },
  emailCard: { gap: Spacing.three },
  emailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emailLabel: { color: Palette.text, fontWeight: '700', fontSize: 14 },
  description: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  grid: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: Spacing.one },
  statValue: { color: Palette.text, fontSize: 22, fontFamily: Fonts.serif, fontWeight: '800' },
  statLabel: { color: Palette.textMuted, fontWeight: '600', fontSize: 12 },
  tabs: { flexDirection: 'row', gap: Spacing.two },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
    ...Shadow.sm,
  },
  tabActive: { borderColor: Palette.primary, backgroundColor: Palette.primaryMuted },
  tabDanger: { borderColor: 'rgba(239,68,68,0.4)' },
  tabLabel: { color: Palette.textMuted, fontWeight: '700', fontFamily: Fonts.sans, fontSize: 13 },
  tabLabelActive: { color: Palette.primary },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 20,
    borderRadius: Radius.sm,
    backgroundColor: Palette.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountActive: { backgroundColor: Palette.primary },
  tabCountDanger: { backgroundColor: 'rgba(239,68,68,0.15)' },
  tabCountText: { color: Palette.text, fontWeight: '800', fontSize: 11 },
  card: { gap: Spacing.two },
  row: { flexDirection: 'row' },
  itemTitle: { color: Palette.text, fontSize: 15, fontWeight: '700' },
});
