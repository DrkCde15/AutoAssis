import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState } from '@/components/primitives';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import type { Vehicle } from '@/lib/types';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

const MOD_CATEGORIES = [
  'motor',
  'turbo',
  'suspensao',
  'freios',
  'rodas',
  'pneus',
  'escapamento',
  'eletronica',
  'som',
  'estetica',
  'interna',
  'outros',
];

type ModEntry = { categoria: string; valor?: number };
type PassportResult = {
  fipe_base?: string | number;
  fipe_ajustada?: string | number;
  pct_ajuste?: number | string;
  valor_extra?: number | string;
  aviso?: string;
};

export function ModPassportScreen({ nav }: { nav: Nav }) {
  const { user, request } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [mods, setMods] = useState<ModEntry[]>([]);
  const [category, setCategory] = useState(MOD_CATEGORIES[0]);
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PassportResult | null>(null);
  const [error, setError] = useState('');

  const isPremium = !!user?.is_premium;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<{ veiculos: Vehicle[] }>('/api/veiculos');
      setVehicles(data.veiculos || []);
      setVehicleId((prev) => prev ?? data.veiculos?.[0]?.id ?? null);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function addMod() {
    const parsed = valor.trim() ? Number(valor) : undefined;
    if (parsed !== undefined && !Number.isFinite(parsed)) {
      setError('Valor inválido.');
      return;
    }
    setMods((prev) => [...prev, { categoria: category, valor: parsed }]);
    setValor('');
    setError('');
  }

  async function calculate() {
    if (!vehicleId) {
      setError('Selecione um veículo.');
      return;
    }
    if (!mods.length) {
      setError('Adicione ao menos uma modificação.');
      return;
    }
    if (!isPremium) {
      Alert.alert('Recurso Premium', 'O Mod Passport é exclusivo do plano Premium.', [
        { text: 'Ver planos', onPress: () => nav.goTo('plans') },
        { text: 'OK' },
      ]);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await request<PassportResult>(`/api/veiculos/${vehicleId}/modificacoes`, {
        method: 'POST',
        body: { modificacoes: mods },
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao calcular o Mod Passport.');
    } finally {
      setSaving(false);
    }
  }

  const pct = result?.pct_ajuste != null ? Number(result.pct_ajuste) : 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.primary} />
      </View>
    );
  }

  if (!vehicles.length) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          title="Nenhum veículo"
          body="Adicione um veículo para usar o Mod Passport."
          action={{ label: 'Adicionar veículo', onPress: () => nav.goTo('vehicles') }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card style={styles.intro}>
        <Text style={styles.title}>Mod Passport</Text>
        <Text style={styles.muted}>
          Estimativa conservadora do valor do seu carro considerando as modificações. Não é uma avaliação oficial.
        </Text>
      </Card>

      <View style={styles.selector}>
        {vehicles.map((v) => {
          const active = v.id === vehicleId;
          return (
            <Pressable
              key={v.id}
              onPress={() => setVehicleId(v.id)}
              style={[styles.chip, active ? styles.chipActive : null]}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.form}>
        <Text style={styles.sectionTitle}>Modificações</Text>
        <View style={styles.modRow}>
          <View style={styles.picker}>
            {MOD_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.catChip, c === category ? styles.catChipActive : null]}>
                <Text style={[styles.catText, c === category ? styles.catTextActive : null]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={valor}
              onChangeText={setValor}
              placeholder="Valor (R$)"
              placeholderTextColor={Palette.textSoft}
              keyboardType="numeric"
              style={styles.valueInput}
            />
            <AppButton title="Adicionar" onPress={addMod} />
          </View>
        </View>

        {mods.length ? (
          <View style={styles.modList}>
            {mods.map((m, i) => (
              <View key={i} style={styles.modItem}>
                <Text style={styles.modName}>{m.categoria}</Text>
                <Text style={styles.modValue}>{m.valor ? formatCurrency(m.valor) : 'Peso padrão'}</Text>
                <Pressable onPress={() => setMods((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={20} color={Palette.red} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>Nenhuma modificação adicionada.</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton title="Calcular valor ajustado" onPress={calculate} loading={saving} />
      </Card>

      {result ? (
        <Card style={styles.result}>
          <Text style={styles.sectionTitle}>Valor estimado</Text>
          <Row label="FIPE" value={String(result.fipe_base ?? '-')} />
          <Row label="Ajustado" value={String(result.fipe_ajustada ?? '-')} highlight />
          <Row label="Ajuste" value={`${pct > 0 ? '+' : ''}${pct}%`} />
          {result.aviso ? <Text style={styles.disclaimer}>{result.aviso}</Text> : null}
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle" size={16} color={Palette.amber} />
            <Text style={styles.disclaimerText}>
              Estimativa conservadora. Não substitui avaliação profissional.
            </Text>
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight ? styles.rowValueHi : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  content: { padding: Spacing.three, gap: Spacing.three },
  intro: { gap: Spacing.one },
  title: { color: Palette.text, fontSize: 22, fontFamily: Fonts.serif, fontWeight: '900' },
  muted: { color: Palette.textMuted, lineHeight: 20 },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
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
  form: { gap: Spacing.two },
  sectionTitle: { color: Palette.text, fontSize: 18, fontFamily: Fonts.serif, fontWeight: '900' },
  modRow: { gap: Spacing.two },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  catChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgAlt,
  },
  catChipActive: { borderColor: Palette.primary, backgroundColor: 'rgba(124,92,255,0.14)' },
  catText: { color: Palette.textMuted, fontSize: 12, fontWeight: '700' },
  catTextActive: { color: Palette.primary },
  addRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  valueInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceStrong,
    color: Palette.text,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.sans,
  },
  modList: { gap: Spacing.one },
  modItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  modName: { flex: 1, color: Palette.text, fontWeight: '800', textTransform: 'capitalize' },
  modValue: { color: Palette.textMuted },
  error: { color: Palette.red, lineHeight: 20 },
  result: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: Palette.textMuted, fontWeight: '700', textTransform: 'uppercase', fontSize: 12 },
  rowValue: { color: Palette.text, fontWeight: '900', fontSize: 18, fontFamily: Fonts.serif },
  rowValueHi: { color: Palette.primary },
  disclaimer: { color: Palette.textMuted, lineHeight: 18 },
  disclaimerBox: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderRadius: Radius.sm,
    padding: Spacing.two,
  },
  disclaimerText: { flex: 1, color: Palette.amber, fontSize: 12, lineHeight: 17 },
});
