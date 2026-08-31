import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Field, LoadingView, Pill, SectionTitle, Stat } from '@/components/primitives';
import { VehiclePhoto } from '@/components/VehiclePhoto';
import { HealthRing } from '@/components/HealthRing';
import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatDate, formatKm } from '@/lib/format';
import type { MaintenanceAlert, Vehicle } from '@/lib/types';
import { useAuth } from '@/context/auth';
import type { AppTab } from './AppShell';

type Fipe = { Valor?: string; MesReferencia?: string };
type SaudeItem = { item: string; msg?: string; status?: string };
type Estatisticas = {
  manutencoes_realizadas?: number;
  data_ultima_manutencao?: string | null;
  chats_realizados?: number;
  health_score?: number;
};
type VehicleDashboard = {
  veiculo: Vehicle;
  fipe?: Fipe;
  saude?: SaudeItem[];
  estatisticas_extras?: Estatisticas;
};

export function DashboardScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request, user, refreshUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dashboards, setDashboards] = useState<Record<number, VehicleDashboard>>({});
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [tipo, setTipo] = useState('carro');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState('');
  const [anoCompra, setAnoCompra] = useState('');
  const [quilometragem, setQuilometragem] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleData, dashData, alertData] = await Promise.all([
        request<{ veiculos: Vehicle[] }>('/api/veiculos'),
        request<VehicleDashboard[]>('/api/dashboard').catch(() => [] as VehicleDashboard[]),
        user?.is_premium
          ? request<{ alertas: MaintenanceAlert[] }>('/api/maintenance/alerts').catch(() => ({ alertas: [] }))
          : Promise.resolve({ alertas: [] }),
      ]);
      const list = vehicleData.veiculos || [];
      setVehicles(list);
      const map: Record<number, VehicleDashboard> = {};
      (Array.isArray(dashData) ? dashData : []).forEach((d) => {
        if (d.veiculo?.id) map[d.veiculo.id] = d;
      });
      setDashboards(map);
      setAlerts(alertData.alertas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o painel.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [request, user?.is_premium]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function startEdit(v: Vehicle) {
    setEditing(v);
    setTipo(v.tipo || 'carro');
    setMarca(v.marca || '');
    setModelo(v.modelo || '');
    setAnoFabricacao(String(v.ano_fabricacao ?? ''));
    setAnoCompra(String(v.ano_compra ?? ''));
    setQuilometragem(String(v.quilometragem ?? ''));
    setError('');
  }

  function resetForm() {
    setEditing(null);
    setTipo('carro');
    setMarca('');
    setModelo('');
    setAnoFabricacao('');
    setAnoCompra('');
    setQuilometragem('');
    setError('');
  }

  async function save() {
    if (!marca.trim() || !modelo.trim()) {
      setError('Informe marca e modelo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        tipo: tipo.trim() || 'carro',
        marca: marca.trim(),
        modelo: modelo.trim(),
        ano_fabricacao: anoFabricacao.trim() || null,
        ano_compra: anoCompra.trim() || null,
        quilometragem: quilometragem.trim() || null,
      };
      if (editing) {
        await request(`/api/veiculos/${editing.id}`, { method: 'PUT', body });
      } else {
        await request('/api/veiculos', { method: 'POST', body });
      }
      resetForm();
      await refreshUser();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao salvar veículo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(vehicle: Vehicle) {
    Alert.alert('Excluir veículo', 'Remover este veículo da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await request(`/api/veiculos/${vehicle.id}`, { method: 'DELETE' });
          await refreshUser();
          await load();
        },
      },
    ]);
  }

  const nextMaintenance = alerts.find((a) => !/conclu|done|ok/i.test(a.status_code || a.status || '')) ?? alerts[0];

  if (loading) {
    return <LoadingView label="Carregando painel..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <SectionTitle kicker="Garagem" title="Meu Carro" subtitle="Gerencie seus veículos e acompanhe a saúde." />

      {user && !user.is_premium ? (
        <Pill tone="warn" label="Recursos avançados no plano Premium" />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {nextMaintenance ? (
        <Card style={styles.nextCard}>
          <View style={styles.nextHead}>
            <Ionicons
              name={/atras|overdue/i.test(nextMaintenance.status_code || '') ? 'warning' : 'time'}
              size={20}
              color={/atras|overdue/i.test(nextMaintenance.status_code || '') ? Palette.red : Palette.amber}
            />
            <View style={styles.nextText}>
              <Text style={styles.nextLabel}>{nextMaintenance.maintenance_label || 'Manutenção'}</Text>
              <Text style={styles.muted}>{nextMaintenance.message || formatDate(nextMaintenance.next_due_date)}</Text>
            </View>
          </View>
          <AppButton variant="ghost" size="sm" onPress={() => goTo('maintenance')}>
            Ver manutenções
          </AppButton>
        </Card>
      ) : null}

      {vehicles.length === 0 ? (
        <EmptyState
          title="Garagem vazia"
          body="Adicione seu veículo para ver o painel de saúde."
        />
      ) : null}

      {vehicles.map((v) => {
        const dash = dashboards[v.id];
        const stats = dash?.estatisticas_extras;
        const score = stats?.health_score ?? 0;
        return (
          <Card key={v.id} style={styles.vehicleCard}>
            <View style={styles.vehicleTop}>
              <VehiclePhoto
                vehicle={v}
                request={request}
                size={72}
                onUpdated={(foto) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, foto_base64: foto } : x)))}
              />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'}</Text>
                <Text style={styles.vehicleMeta}>
                  {v.tipo || '-'} · {v.ano_fabricacao || '-'} · {formatKm(v.quilometragem ?? 0)}
                </Text>
                {dash?.fipe?.Valor ? (
                  <Text style={styles.fipe}>
                    FIPE {dash.fipe.Valor} {dash.fipe.MesReferencia ? `(${dash.fipe.MesReferencia})` : ''}
                  </Text>
                ) : null}
              </View>
              {score > 0 ? <HealthRing score={score} size={64} stroke={8} showLabel={false} /> : null}
            </View>

            {dash?.saude && dash.saude.length > 0 ? (
              <View style={styles.saude}>
                {dash.saude.map((s, i) => (
                  <Pill key={i} tone={s.status === 'OK' ? 'good' : 'neutral'} size="sm">
                    {s.item}
                  </Pill>
                ))}
              </View>
            ) : null}

            {stats ? (
              <View style={styles.stats}>
                <Stat label="Manutenções" value={String(stats.manutencoes_realizadas ?? 0)} align="center" />
                <Stat label="Consultas" value={String(stats.chats_realizados ?? 0)} align="center" />
                {stats.data_ultima_manutencao ? (
                  <Stat label="Última manut." value={stats.data_ultima_manutencao} align="center" />
                ) : null}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable onPress={() => startEdit(v)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={18} color={Palette.textMuted} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(v)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={Palette.red} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <AppButton title="Mod Passport" variant="secondary" size="sm" onPress={() => goTo('modpassport')} />
              <AppButton title="NOG" variant="ghost" size="sm" onPress={() => goTo('chat')} />
            </View>
          </Card>
        );
      })}

      <Card style={styles.form}>
        <Text style={styles.formTitle}>{editing ? 'Editar veículo' : 'Novo veículo'}</Text>
        <Text style={styles.muted}>Esses dados deixam o chat e as previsões mais precisos.</Text>
        {editing ? <Pill tone="info" size="sm" label={`Editando: ${editing.marca} ${editing.modelo}`} /> : null}
        <Field label="Tipo" value={tipo} onChangeText={setTipo} placeholder="carro, moto, pickup" />
        <Field label="Marca" value={marca} onChangeText={setMarca} placeholder="Toyota" />
        <Field label="Modelo" value={modelo} onChangeText={setModelo} placeholder="Corolla" />
        <View style={styles.twoColumns}>
          <Field
            label="Ano"
            value={anoFabricacao}
            onChangeText={setAnoFabricacao}
            keyboardType="number-pad"
            placeholder="2020"
            style={styles.flexField}
          />
          <Field
            label="Compra"
            value={anoCompra}
            onChangeText={setAnoCompra}
            keyboardType="number-pad"
            placeholder="2024"
            style={styles.flexField}
          />
        </View>
        <Field
          label="Quilometragem"
          value={quilometragem}
          onChangeText={setQuilometragem}
          keyboardType="number-pad"
          placeholder="65000"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.formActions}>
          <AppButton title={editing ? 'Salvar' : 'Adicionar'} onPress={save} loading={saving} />
          {editing ? <AppButton title="Cancelar" variant="ghost" onPress={resetForm} /> : null}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.four },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },
  nextCard: { gap: Spacing.two, ...Shadow.sm },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nextText: { flex: 1, gap: 2 },
  nextLabel: { color: Palette.text, fontWeight: '700', fontSize: 14 },
  muted: { color: Palette.textMuted, lineHeight: 18, fontSize: 13 },
  vehicleCard: { gap: Spacing.three, ...Shadow.sm },
  vehicleTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  vehicleInfo: { flex: 1, gap: Spacing.one },
  vehicleName: { color: Palette.text, fontSize: 17, fontWeight: '700' },
  vehicleMeta: { color: Palette.textMuted, fontSize: 13 },
  fipe: { color: Palette.accent, fontSize: 13, fontWeight: '600' },
  saude: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  stats: { flexDirection: 'row', gap: Spacing.two },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgAlt,
  },
  form: { gap: Spacing.three },
  formTitle: { color: Palette.text, fontSize: 17, fontWeight: '700', fontFamily: Fonts.sans },
  twoColumns: { flexDirection: 'row', gap: Spacing.two },
  flexField: { flex: 1 },
  formActions: { gap: Spacing.two },
});
