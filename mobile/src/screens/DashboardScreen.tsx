import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Field, Pill } from '@/components/primitives';
import { VehiclePhoto } from '@/components/VehiclePhoto';
import { HealthRing } from '@/components/HealthRing';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
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
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Carregando painel…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Painel</Text>
      {user && !user.is_premium && (
        <Pill tone="warn">Recursos avançados disponiveis no plano Premium</Pill>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

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

      {vehicles.length === 0 ? (
        <EmptyState
          title="Garagem vazia"
          message="Adicione seu veículo para ver o painel de saúde e personalizar o app."
        />
      ) : null}

      {vehicles.map((v) => {
        const dash = dashboards[v.id];
        const stats = dash?.estatisticas_extras;
        const score = stats?.health_score ?? 0;
        return (
          <Card key={v.id} style={styles.card}>
            <View style={styles.cardTop}>
              <VehiclePhoto
                vehicle={v}
                request={request}
                size={64}
                onUpdated={(foto) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, foto_base64: foto } : x)))}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.vehicleName}>{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'}</Text>
                <Text style={styles.vehicleMeta}>
                  {v.tipo || '—'} · {v.ano_fabricacao || '-'} · {formatKm(v.quilometragem ?? 0)}
                </Text>
                {dash?.fipe?.Valor ? (
                  <Text style={styles.fipe}>
                    FIPE: {dash.fipe.Valor} {dash.fipe.MesReferencia ? `(${dash.fipe.MesReferencia})` : ''}
                  </Text>
                ) : null}
              </View>
              <HealthRing score={score} size={84} stroke={10} showLabel={false} />
            </View>

            {dash?.saude && dash.saude.length > 0 ? (
              <View style={styles.saude}>
                {dash.saude.map((s, i) => (
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

            <View style={styles.actions}>
              <Pressable onPress={() => startEdit(v)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={20} color={Palette.text} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(v)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={Palette.red} />
              </Pressable>
              <AppButton title="Mod Passport" variant="secondary" onPress={() => goTo('modpassport')} />
              <AppButton title="Perguntar à NOG" variant="ghost" onPress={() => goTo('chat')} />
            </View>
          </Card>
        );
      })}

      <Card style={styles.form}>
        <Text style={styles.formTitle}>{editing ? 'Editar veículo' : 'Adicionar veículo'}</Text>
        <Text style={styles.muted}>Esses dados deixam o chat e as previsões mais precisos.</Text>
        {editing ? <Pill tone="info" label={`Editando: ${editing.marca} ${editing.modelo}`} /> : null}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  loadingText: { color: Palette.textMuted },
  container: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Palette.text, fontSize: 22, fontWeight: '700', fontFamily: Fonts.serif },
  error: { color: Palette.red, lineHeight: 20 },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgAlt,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  form: { gap: Spacing.two },
  formTitle: { color: Palette.text, fontSize: 18, fontWeight: '900', fontFamily: Fonts.serif },
  twoColumns: { flexDirection: 'row', gap: Spacing.two },
  flexField: { flex: 1 },
  formActions: { gap: Spacing.two },
});
