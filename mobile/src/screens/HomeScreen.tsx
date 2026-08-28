import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { VehiclePhoto } from '@/components/VehiclePhoto';
import { HealthRing } from '@/components/HealthRing';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { formatDate, formatKm } from '@/lib/format';
import type { MaintenanceAlert, Vehicle } from '@/lib/types';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

type DashboardVehicle = {
  veiculo: {
    id: number;
    tipo?: string;
    marca?: string;
    modelo?: string;
    ano_fabricacao?: number;
    quilometragem?: number;
  };
  fipe?: { Valor?: string; MesReferencia?: string };
  saude?: { item: string; msg?: string; status?: string }[];
  estatisticas_extras?: { health_score?: number; manutencoes_realizadas?: number };
};

type NavProps = { nav: Nav };

export function HomeScreen({ nav }: NavProps) {
  const { user, request, refreshUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>(user?.veiculos || []);
  const [dashboards, setDashboards] = useState<DashboardVehicle[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setOffline(false);
    try {
      await refreshUser();
      const [vehicleData, dashData, alertData] = await Promise.all([
        request<{ veiculos: Vehicle[] }>('/api/veiculos'),
        request<DashboardVehicle[]>('/api/dashboard').catch(() => [] as DashboardVehicle[]),
        user?.is_premium
          ? request<{ alertas: MaintenanceAlert[] }>('/api/maintenance/alerts').catch(() => ({ alertas: [] }))
          : Promise.resolve({ alertas: [] }),
      ]);
      setVehicles(vehicleData.veiculos || []);
      setDashboards(Array.isArray(dashData) ? dashData : []);
      setAlerts(alertData.alertas || []);
      setSelectedId((prev) => prev ?? vehicleData.veiculos?.[0]?.id ?? null);
    } catch (err) {
      const offlineNow = err instanceof Error && /network|fetch|Network request failed/i.test(err.message);
      setOffline(offlineNow);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [request, refreshUser, user?.is_premium]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const dashboard = useMemo(
    () => dashboards.find((d) => d.veiculo.id === selectedId) ?? dashboards[0],
    [dashboards, selectedId],
  );
  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? vehicles[0],
    [vehicles, selectedId],
  );

  const healthScore = dashboard?.estatisticas_extras?.health_score ?? 0;
  const saudeItems = dashboard?.saude ?? [];
  const nextMaintenance = alerts.find((a) => !/conclu|done|ok/i.test(a.status_code || a.status || '')) ?? alerts[0];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.kicker}>Seu copiloto de carro</Text>
            <Text style={styles.greeting}>Olá, {user?.nome?.split(' ')[0] || 'motorista'}.</Text>
          </View>
          <Pressable style={styles.painelLink} onPress={() => nav.goTo('dashboard')} hitSlop={8}>
            <Text style={styles.painelLinkText}>Painel</Text>
            <Ionicons name="chevron-forward" size={16} color={Palette.primary} />
          </Pressable>
        </View>
        <Text style={styles.heroSub}>Tudo sobre o seu veículo, em um só lugar.</Text>

        {vehicle ? (
          <Pressable style={styles.heroVehicle} onPress={() => nav.goTo('vehicles')} hitSlop={8}>
            <VehiclePhoto
              vehicle={vehicle}
              request={request}
              size={92}
              onUpdated={(foto) =>
                setVehicles((prev) => prev.map((x) => (x.id === vehicle.id ? { ...x, foto_base64: foto } : x)))
              }
            />
            <View style={styles.heroVehicleInfo}>
              <Text style={styles.heroVehicleName}>
                {[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Veículo'}
              </Text>
              <Text style={styles.heroVehicleMeta}>
                {vehicle.ano_fabricacao || '-'} · {formatKm(vehicle.quilometragem)}
              </Text>
              {dashboard?.fipe?.Valor ? (
                <Text style={styles.heroVehicleFipe}>
                  FIPE {dashboard.fipe.Valor}
                  {dashboard.fipe.MesReferencia ? ` · ${dashboard.fipe.MesReferencia}` : ''}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
          </Pressable>
        ) : (
          <EmptyState
            title="Nenhum veículo cadastrado"
            body="Adicione seu carro para respostas contextuais da NOG."
            action={{ label: 'Adicionar veículo', onPress: () => nav.goTo('vehicles') }}
          />
        )}
      </Card>

      {offline ? <Pill tone="warn" label="Sem conexão — mostrando dados locais" /> : null}

      {vehicles.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {vehicles.map((v) => {
            const active = v.id === (vehicle?.id ?? -1);
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelectedId(v.id)}
                style={[styles.chip, active ? styles.chipActive : null]}>
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Card style={styles.healthCard}>
        <View style={styles.healthBody}>
          <HealthRing score={healthScore} size={128} stroke={14} />
          <View style={styles.healthItems}>
            <Text style={styles.sectionTitle}>Saúde do veículo</Text>
            {saudeItems.length ? (
              <View style={styles.saudeRow}>
                {saudeItems.map((s, i) => (
                  <Pill key={i} tone={s.status === 'OK' ? 'good' : 'warn'} label={s.item} />
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>Sem avaliação de itens ainda.</Text>
            )}
          </View>
        </View>
      </Card>

      <Card style={styles.nextCard}>
        <Text style={styles.sectionTitle}>Próxima manutenção</Text>
        {nextMaintenance ? (
          <View style={styles.nextBody}>
            <Ionicons
              name={/atras|overdue/i.test(nextMaintenance.status_code || '') ? 'warning' : 'time'}
              size={22}
              color={/atras|overdue/i.test(nextMaintenance.status_code || '') ? Palette.red : Palette.amber}
            />
            <View style={styles.nextText}>
              <Text style={styles.nextLabel}>{nextMaintenance.maintenance_label || 'Manutenção'}</Text>
              <Text style={styles.muted}>{nextMaintenance.message || formatDate(nextMaintenance.next_due_date)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.muted}>Nenhuma manutenção pendente. 🎉</Text>
        )}
        <AppButton variant="ghost" title="Ver manutenções" onPress={() => nav.goTo('maintenance')} />
      </Card>

      <Text style={styles.actionsTitle}>Ações rápidas</Text>
      <View style={styles.actionsGrid}>
        <QuickAction icon="chatbubble-ellipses" label="Perguntar à NOG" color={Palette.primary} onPress={() => nav.goTo('chat')} />
        <QuickAction icon="scan" label="Raio-X" color={Palette.accent} onPress={() => nav.goTo('raiox')} />
        <QuickAction icon="construct" label="Mecânico" color={Palette.blue} onPress={() => nav.goTo('mechanics')} />
        <QuickAction icon="cash" label="FIPE" color={Palette.green} onPress={() => nav.goTo('vehicles')} />
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return Palette.green;
  if (score >= 50) return Palette.amber;
  return Palette.red;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  content: { padding: Spacing.three, gap: Spacing.three },
  hero: { gap: Spacing.three, padding: Spacing.four },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  kicker: { color: Palette.primary, fontSize: 12, fontFamily: Fonts.serif, fontWeight: '900', textTransform: 'uppercase' },
  greeting: { color: Palette.text, fontSize: 26, fontFamily: Fonts.serif, fontWeight: '900', marginTop: Spacing.one },
  heroSub: { color: Palette.textMuted, lineHeight: 21, marginTop: Spacing.one },
  painelLink: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: Spacing.one },
  painelLinkText: { color: Palette.primary, fontWeight: '800', fontSize: 14 },
  heroVehicle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  heroVehicleInfo: { flex: 1, gap: Spacing.one },
  heroVehicleName: { color: Palette.text, fontSize: 20, fontFamily: Fonts.sans, fontWeight: '900' },
  heroVehicleMeta: { color: Palette.textMuted },
  heroVehicleFipe: { color: Palette.accent, fontWeight: '700', fontSize: 13 },
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  chipActive: { borderColor: Palette.primary, backgroundColor: 'rgba(124,92,255,0.14)' },
  chipText: { color: Palette.textMuted, fontWeight: '800', fontFamily: Fonts.sans },
  chipTextActive: { color: Palette.primary },
  healthCard: { gap: Spacing.two },
  healthBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  healthItems: { flex: 1, gap: Spacing.two },
  sectionTitle: { color: Palette.text, fontSize: 18, fontFamily: Fonts.serif, fontWeight: '900' },
  saudeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  nextCard: { gap: Spacing.two },
  nextBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nextText: { flex: 1, gap: Spacing.one },
  nextLabel: { color: Palette.text, fontWeight: '800' },
  muted: { color: Palette.textMuted, lineHeight: 20 },
  actionsTitle: { color: Palette.text, fontSize: 16, fontFamily: Fonts.serif, fontWeight: '900', marginTop: Spacing.one },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quick: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: Palette.text, fontWeight: '800', fontFamily: Fonts.sans },
});
