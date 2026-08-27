import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Field, Pill } from '@/components/primitives';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { formatKm } from '@/lib/format';
import type { Vehicle } from '@/lib/types';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

type DashboardVehicle = {
  veiculo: { id: number; tipo?: string; marca?: string; modelo?: string; ano_fabricacao?: number; quilometragem?: number };
  fipe?: { Valor?: string; MesReferencia?: string };
  estatisticas_extras?: { health_score?: number; manutencoes_realizadas?: number };
};

export function VehiclesScreen({ nav }: { nav: Nav }) {
  const { request, refreshUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dashboards, setDashboards] = useState<DashboardVehicle[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
    setRefreshing(true);
    try {
      const [vehicleData, dashData] = await Promise.all([
        request<{ veiculos: Vehicle[] }>('/api/veiculos'),
        request<DashboardVehicle[]>('/api/dashboard').catch(() => [] as DashboardVehicle[]),
      ]);
      setVehicles(vehicleData.veiculos || []);
      setDashboards(Array.isArray(dashData) ? dashData : []);
      setSelectedId((prev) => prev ?? vehicleData.veiculos?.[0]?.id ?? null);
    } finally {
      setRefreshing(false);
    }
  }, [request]);

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

  const dashboard = dashboards.find((d) => d.veiculo.id === selectedId) ?? dashboards[0];
  const vehicle = vehicles.find((v) => v.id === selectedId) ?? vehicles[0];
  const health = dashboard?.estatisticas_extras?.health_score ?? 0;
  const maintCount = dashboard?.estatisticas_extras?.manutencoes_realizadas ?? 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.heading}>Meu Carro</Text>

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
        <Card style={styles.detail}>
          <View style={styles.photo}>
            <Ionicons name="car-sport" size={48} color={Palette.primary} />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailName}>
              {[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Veículo'}
            </Text>
            <Text style={styles.detailMeta}>
              {vehicle.ano_fabricacao || '-'} · {formatKm(vehicle.quilometragem)}
            </Text>
          </View>
          <View style={styles.detailActions}>
            <Pressable onPress={() => startEdit(vehicle)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={20} color={Palette.text} />
            </Pressable>
            <Pressable onPress={() => confirmDelete(vehicle)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color={Palette.red} />
            </Pressable>
          </View>

          <View style={styles.valueRow}>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>FIPE</Text>
              <Text style={styles.valueText}>{dashboard?.fipe?.Valor ?? '—'}</Text>
              {dashboard?.fipe?.MesReferencia ? (
                <Text style={styles.valueSub}>{dashboard.fipe.MesReferencia}</Text>
              ) : null}
            </View>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>Saúde</Text>
              <Text style={[styles.valueText, { color: health >= 80 ? Palette.green : health >= 50 ? Palette.amber : Palette.red }]}>
                {health}%
              </Text>
            </View>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>Manut.</Text>
              <Text style={styles.valueText}>{maintCount}</Text>
            </View>
          </View>

          <View style={styles.modRow}>
            <AppButton title="Mod Passport" variant="secondary" onPress={() => nav.goTo('modpassport')} />
            <AppButton title="Ver FIPE" variant="ghost" onPress={() => nav.goTo('dashboard')} />
          </View>
          {dashboard?.fipe?.Valor ? (
            <Text style={styles.fipeNote}>Fonte: Tabela FIPE · estimativa não substitui avaliação profissional.</Text>
          ) : null}
        </Card>
      ) : (
        <EmptyState title="Garagem vazia" body="Cadastre seu primeiro veículo para personalizar o app." />
      )}

      <Card style={styles.form}>
        <Text style={styles.formTitle}>{editing ? 'Editar veículo' : 'Adicionar veículo'}</Text>
        <Text style={styles.muted}>Esses dados deixam o chat e as previsões mais precisos.</Text>
        {editing ? <Pill tone="info" label={`Editando: ${editing.marca} ${editing.modelo}`} /> : null}
        <Field label="Tipo" value={tipo} onChangeText={setTipo} placeholder="carro, moto, pickup" />
        <Field label="Marca" value={marca} onChangeText={setMarca} placeholder="Toyota" />
        <Field label="Modelo" value={modelo} onChangeText={setModelo} placeholder="Corolla" />
        <View style={styles.twoColumns}>
          <Field label="Ano" value={anoFabricacao} onChangeText={setAnoFabricacao} keyboardType="number-pad" placeholder="2020" style={styles.flexField} />
          <Field label="Compra" value={anoCompra} onChangeText={setAnoCompra} keyboardType="number-pad" placeholder="2024" style={styles.flexField} />
        </View>
        <Field label="Quilometragem" value={quilometragem} onChangeText={setQuilometragem} keyboardType="number-pad" placeholder="65000" />
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
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  heading: { color: Palette.text, fontSize: 22, fontFamily: Fonts.serif, fontWeight: '900' },
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
  detail: { gap: Spacing.three },
  photo: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Palette.bgAlt, alignItems: 'center', justifyContent: 'center' },
  detailInfo: { gap: Spacing.one },
  detailName: { color: Palette.text, fontSize: 20, fontFamily: Fonts.sans, fontWeight: '900' },
  detailMeta: { color: Palette.textMuted },
  detailActions: { flexDirection: 'row', gap: Spacing.two },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bgAlt, borderWidth: 1, borderColor: Palette.border },
  valueRow: { flexDirection: 'row', gap: Spacing.two },
  valueBox: { flex: 1, backgroundColor: Palette.bgAlt, borderRadius: Radius.sm, padding: Spacing.two, gap: Spacing.one },
  valueLabel: { color: Palette.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  valueText: { color: Palette.text, fontSize: 18, fontFamily: Fonts.serif, fontWeight: '900' },
  valueSub: { color: Palette.textSoft, fontSize: 11 },
  modRow: { flexDirection: 'row', gap: Spacing.two },
  fipeNote: { color: Palette.textSoft, fontSize: 12, lineHeight: 16 },
  form: { gap: Spacing.two },
  formTitle: { color: Palette.text, fontSize: 18, fontFamily: Fonts.serif, fontWeight: '900' },
  muted: { color: Palette.textMuted, lineHeight: 20 },
  twoColumns: { flexDirection: 'row', gap: Spacing.two },
  flexField: { flex: 1 },
  error: { color: Palette.red },
  formActions: { gap: Spacing.two },
});
