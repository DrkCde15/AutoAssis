import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from './AppShell';

type VehicleInfo = {
  id: number;
  tipo: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  quilometragem: number;
};

type Fipe = { Valor?: string; MesReferencia?: string };

type SaudeItem = { item: string; msg: string; status: string };

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
  predicao?: Record<string, unknown>;
  estatisticas_extras?: Estatisticas;
};

function scoreTone(score?: number): 'good' | 'warn' | 'danger' {
  const s = score ?? 0;
  if (s >= 80) return 'good';
  if (s >= 50) return 'warn';
  return 'danger';
}

export function DashboardScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request, user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<VehicleDashboard[]>('/api/dashboard');
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o painel.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

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

      {vehicles.map((v) => {
        const stats = v.estatisticas_extras;
        return (
          <Card key={v.veiculo.id}>
            <Text style={styles.vehicleName}>
              {v.veiculo.marca} {v.veiculo.modelo}
            </Text>
            <Text style={styles.vehicleMeta}>
              {v.veiculo.tipo} · {v.veiculo.ano_fabricacao} · {v.veiculo.quilometragem.toLocaleString('pt-BR')} km
            </Text>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Saude</Text>
              <Pill tone={scoreTone(stats?.health_score)}>{stats?.health_score ?? '—'}</Pill>
            </View>

            {v.fipe?.Valor ? (
              <Text style={styles.fipe}>
                FIPE: {v.fipe.Valor} {v.fipe.MesReferencia ? `(${v.fipe.MesReferencia})` : ''}
              </Text>
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

            {v.saude && v.saude.length > 0 ? (
              <View style={styles.saude}>
                {v.saude.map((s, i) => (
                  <Pill key={i} tone={s.status === 'OK' ? 'good' : 'neutral'}>
                    {s.item}
                  </Pill>
                ))}
              </View>
            ) : null}
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
  vehicleName: { color: Palette.text, fontSize: 18, fontWeight: '700' },
  vehicleMeta: { color: Palette.textMuted, fontSize: 14, marginTop: Spacing.one },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  scoreLabel: { color: Palette.text, fontSize: 14, fontWeight: '600' },
  fipe: { color: Palette.textMuted, fontSize: 14, marginTop: Spacing.two },
  stats: { marginTop: Spacing.two, gap: 2 },
  stat: { color: Palette.textSoft, fontSize: 13 },
  saude: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
});
