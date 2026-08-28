import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { VehiclePhoto } from '@/components/VehiclePhoto';
import { HealthRing } from '@/components/HealthRing';
import { Palette, Spacing } from '@/constants/theme';
import { formatDate, formatKm } from '@/lib/format';
import type { MaintenanceAlert } from '@/lib/types';
import { useAuth } from '@/context/auth';
import type { AppTab } from './AppShell';

type VehicleInfo = {
  id: number;
  tipo?: string;
  marca?: string;
  modelo?: string;
  ano_fabricacao?: number | null;
  quilometragem?: number | null;
  foto_base64?: string | null;
};

type Fipe = { Valor?: string; MesReferencia?: string };

type SaudeItem = { item: string; msg?: string; status?: string };

type Estatisticas = {
  manutencoes_realizadas?: number;
  data_ultima_manutencao?: string | null;
  chats_realizados?: number;
  health_score?: number;
};

type VehicleDashboard = {
  veiculo: VehicleInfo;
  fipe?: Fipe;
  saude?: SaudeItem[];
  estatisticas_extras?: Estatisticas;
};

export function DashboardScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request, user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDashboard[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, alertData] = await Promise.all([
        request<VehicleDashboard[]>('/api/dashboard'),
        user?.is_premium
          ? request<{ alertas: MaintenanceAlert[] }>('/api/maintenance/alerts').catch(() => ({ alertas: [] }))
          : Promise.resolve({ alertas: [] }),
      ]);
      setVehicles(Array.isArray(data) ? data : []);
      setAlerts(alertData.alertas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o painel.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [request, user?.is_premium]);

  useEffect(() => {
    load();
  }, [load]);

  const nextMaintenance = alerts.find((a) => !/conclu|done|ok/i.test(a.status_code || a.status || '')) ?? alerts[0];

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

  if (vehicles.length === 0) {
    return (
      <EmptyState
        title="Nenhum veiculo"
        message="Adicione um veiculo no app para ver o painel de saude."
        action={{ label: 'Ver meus veiculos', onPress: () => goTo('vehicles') }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Painel</Text>
      {user && !user.is_premium && (
        <Pill tone="warn">Recursos avancados disponiveis no plano Premium</Pill>
      )}

      {nextMaintenance ? (
        <Card style={styles.nextCard}>
          <View style={styles.nextHead}>
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
          <AppButton variant="ghost" onPress={() => goTo('maintenance')}>
            Ver manutenções
          </AppButton>
        </Card>
      ) : null}

      {vehicles.map((v) => {
        const veic = v.veiculo;
        const stats = v.estatisticas_extras;
        const score = stats?.health_score ?? 0;
        return (
          <Card key={veic.id} style={styles.card}>
            <View style={styles.cardTop}>
              <VehiclePhoto
                vehicle={{ id: veic.id, foto_base64: veic.foto_base64 }}
                request={request}
                size={64}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.vehicleName}>
                  {[veic.marca, veic.modelo].filter(Boolean).join(' ') || 'Veículo'}
                </Text>
                <Text style={styles.vehicleMeta}>
                  {veic.tipo || '—'} · {veic.ano_fabricacao || '-'} · {formatKm(veic.quilometragem ?? 0)}
                </Text>
                {v.fipe?.Valor ? (
                  <Text style={styles.fipe}>
                    FIPE: {v.fipe.Valor} {v.fipe.MesReferencia ? `(${v.fipe.MesReferencia})` : ''}
                  </Text>
                ) : null}
              </View>
              <HealthRing score={score} size={84} stroke={10} showLabel={false} />
            </View>

            {v.saude && v.saude.length > 0 ? (
              <View style={styles.saude}>
                {v.saude.map((s, i) => (
                  <Pill key={i} tone={s.status === 'OK' ? 'good' : 'neutral'}>
                    {s.item}
                  </Pill>
                ))}
              </View>
            ) : null}

            {stats ? (
              <View style={styles.stats}>
                <Text style={styles.stat}>Manutencoes: {stats.manutencoes_realizadas ?? 0}</Text>
                <Text style={styles.stat}>Chats: {stats.chats_realizados ?? 0}</Text>
                {stats.data_ultima_manutencao ? (
                  <Text style={styles.stat}>Ultima manut.: {stats.data_ultima_manutencao}</Text>
                ) : null}
              </View>
            ) : null}

            <AppButton
              variant="ghost"
              onPress={() => goTo('chat')}
              title={`Perguntar sobre ${veic.marca || 'o veículo'} à NOG`}
            />
          </Card>
        );
      })}

      <AppButton variant="ghost" onPress={() => goTo('more')}>
        Voltar
      </AppButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  container: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Palette.text, fontSize: 22, fontWeight: '700' },
  nextCard: { gap: Spacing.two },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nextText: { flex: 1, gap: Spacing.one },
  nextLabel: { color: Palette.text, fontWeight: '800' },
  card: { gap: Spacing.three },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardInfo: { flex: 1, gap: Spacing.one },
  vehicleName: { color: Palette.text, fontSize: 18, fontWeight: '700' },
  vehicleMeta: { color: Palette.textMuted, fontSize: 14 },
  fipe: { color: Palette.textMuted, fontSize: 14 },
  saude: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stats: { gap: 2 },
  stat: { color: Palette.textMuted, fontSize: 13 },
  muted: { color: Palette.textMuted, lineHeight: 20 },
});
