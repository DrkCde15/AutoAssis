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
        <Text style={styles.kicker}>Seu copiloto de carro</Text>
        <Text style={styles.greeting}>Olá, {user?.nome?.split(' ')[0] || 'motorista'}.</Text>
        <Text style={styles.heroSub}>Tudo sobre o seu veículo, em um só lugar. Toque em uma ação para resolver.</Text>
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

      {vehicle ? (
        <Card style={styles.vehicleCard}>
          <View style={styles.vehiclePhoto}>
            <Ionicons name="car-sport" size={40} color={Palette.primary} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>
              {[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Veículo'}
            </Text>
            <Text style={styles.vehicleMeta}>
              {vehicle.ano_fabricacao || '-'} · {formatKm(vehicle.quilometragem)}
            </Text>
            {dashboard?.fipe?.Valor ? (
              <Text style={styles.vehicleFipe}>
                FIPE {dashboard.fipe.Valor}
                {dashboard.fipe.MesReferencia ? ` · ${dashboard.fipe.MesReferencia}` : ''}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => nav.goTo('vehicles')} style={styles.vehicleEdit}>
            <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
          </Pressable>
        </Card>
      ) : (
        <EmptyState
          title="Nenhum veículo cadastrado"
          body="Adicione seu carro para respostas contextuais da NOG."
          action={{ label: 'Adicionar veículo', onPress: () => nav.goTo('vehicles') }}
        />
      )}

      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <Text style={styles.sectionTitle}>Saúde do veículo</Text>
          <Text style={[styles.healthScore, { color: scoreColor(healthScore) }]}>{healthScore}%</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(0, Math.min(100, healthScore))}%`, backgroundColor: scoreColor(healthScore) },
            ]}
          />
        </View>
        <View style={styles.saudeRow}>
          {saudeItems.length ? (
            saudeItems.map((s, i) => (
              <Pill key={i} tone={s.status === 'OK' ? 'good' : 'warn'} label={s.item} />
            ))
          ) : (
            <Text style={styles.muted}>Sem avaliação de itens ainda.</Text>
          )}
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

function scoreColor(score: number) {
  if (score >= 80) return Palette.green;
  if (score >= 50) return Palette.amber;
  return Palette.red;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  content: { padding: Spacing.three, gap: Spacing.three },
  hero: { gap: Spacing.one },
  kicker: { color: Palette.primary, fontSize: 12, fontFamily: Fonts.serif, fontWeight: '900', textTransform: 'uppercase' },
  greeting: { color: Palette.text, fontSize: 26, fontFamily: Fonts.serif, fontWeight: '900' },
  heroSub: { color: Palette.textMuted, lineHeight: 21 },
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
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  vehiclePhoto: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1, gap: Spacing.one },
  vehicleName: { color: Palette.text, fontSize: 18, fontFamily: Fonts.sans, fontWeight: '900' },
  vehicleMeta: { color: Palette.textMuted },
  vehicleFipe: { color: Palette.accent, fontWeight: '700', fontSize: 13 },
  vehicleEdit: { padding: Spacing.one },
  healthCard: { gap: Spacing.two },
  healthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: Palette.text, fontSize: 18, fontFamily: Fonts.serif, fontWeight: '900' },
  healthScore: { fontSize: 22, fontFamily: Fonts.serif, fontWeight: '900' },
  track: { height: 10, borderRadius: 999, backgroundColor: Palette.bgAlt, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 999 },
  saudeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
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
