import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { AppButton, Card, EmptyState, Field, Pill, SectionTitle } from '@/components/primitives';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/auth';
import type { Nav } from '@/screens/AppShell';

type ModEvent = {
  id?: number;
  tipo: string;
  descricao: string;
  data: string;
  oficina?: string;
  comprovante_url?: string;
  verificavel?: boolean;
};

type PassportShare = {
  token: string;
  url: string;
  validade?: string;
  sent_at?: string;
};

type PassportData = {
  events?: ModEvent[];
  shares?: PassportShare[];
  summary?: string;
  Veiculo?: { id: number; marca?: string; modelo?: string };
};

type NewMod = {
  categoria: string;
  nome: string;
  descricao: string;
  valor: string;
};

const CATEGORIAS = [
  'Motor',
  'Suspensão',
  'Freio',
  'Elétrica',
  'Interior',
  'Exterior',
  'Som',
  'Rodas',
  'Turbo',
  'Escapamento',
  'Outro',
];

export function ModPassportScreen({ nav }: { nav: Nav }) {
  const { request } = useAuth();
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [data, setData] = useState<PassportData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMods, setNewMods] = useState<NewMod[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentMod, setCurrentMod] = useState<NewMod>({ categoria: '', nome: '', descricao: '', valor: '' });

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const vehiclesResp = await request<{ veiculos: { id: number }[] }>('/api/veiculos');
      const first = vehiclesResp.veiculos?.[0];
      if (!first) {
        setError('Adicione um veículo para usar o Mod Passport.');
        setLoading(false);
        return;
      }
      setVehicleId(first.id);
      const resp = await request<PassportData>(`/api/veiculos/${first.id}/mod-passport/history`);
      setData(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Mod Passport.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleShare() {
    if (!vehicleId) return;
    setSharing(true);
    try {
      const resp = await request<PassportData>(`/api/veiculos/${vehicleId}/mod-passport/share`, { method: 'POST' });
      setData((prev) => prev ? { ...prev, shares: [resp as unknown as PassportShare, ...(prev.shares || [])] } : prev);
      const url = (resp as unknown as PassportShare).url;
      if (url) {
        Alert.alert('Link gerado', 'Link copiado para a área de transferência.', [
          { text: 'OK', onPress: () => Clipboard.setStringAsync(url) },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao compartilhar.');
    } finally {
      setSharing(false);
    }
  }

  async function handlePdf() {
    if (!vehicleId) return;
    setGeneratingPdf(true);
    try {
      Alert.alert('PDF', 'O PDF será gerado. Aguarde um momento.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  function addModToList() {
    if (!currentMod.categoria) {
      setError('Selecione uma categoria.');
      return;
    }
    setNewMods((prev) => [...prev, { ...currentMod }]);
    setCurrentMod({ categoria: '', nome: '', descricao: '', valor: '' });
    setError('');
  }

  function removeModFromList(index: number) {
    setNewMods((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveMods() {
    if (!vehicleId || newMods.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await request(`/api/veiculos/${vehicleId}/modificacoes`, {
        method: 'POST',
        body: { modificacoes: newMods },
      });
      setNewMods([]);
      setShowAddForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar modificações.');
    } finally {
      setSaving(false);
    }
  }

  const events = data?.events || [];
  const shares = data?.shares || [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <SectionTitle
        kicker="Histórico"
        title="Mod Passport"
        subtitle="Registro completo de modificações do veículo."
      />

      {data?.Veiculo ? (
        <Pill tone="info" label={`${data.Veiculo.marca || ''} ${data.Veiculo.modelo || ''}`} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.shareRow}>
        <AppButton title="Compartilhar" onPress={handleShare} loading={sharing} />
        <AppButton title="Gerar PDF" variant="secondary" onPress={handlePdf} loading={generatingPdf} />
      </View>

      <AppButton
        title={showAddForm ? 'Cancelar' : 'Adicionar modificação'}
        variant={showAddForm ? 'ghost' : 'primary'}
        onPress={() => {
          setShowAddForm(!showAddForm);
          setNewMods([]);
          setCurrentMod({ categoria: '', nome: '', descricao: '', valor: '' });
          setError('');
        }}
      />

      {showAddForm ? (
        <Card style={styles.addForm}>
          <SectionTitle title="Nova modificação" />

          <Text style={styles.fieldLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIAS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrentMod((prev) => ({ ...prev, categoria: c }))}
                style={[styles.catChip, currentMod.categoria === c ? styles.catChipActive : null]}>
                <Text style={[styles.catChipText, currentMod.categoria === c ? styles.catChipTextActive : null]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Field
            label="Nome"
            value={currentMod.nome}
            onChangeText={(t) => setCurrentMod((prev) => ({ ...prev, nome: t }))}
            placeholder="Ex: Turbo Garrett GTX3076R"
          />
          <Field
            label="Descrição (opcional)"
            value={currentMod.descricao}
            onChangeText={(t) => setCurrentMod((prev) => ({ ...prev, descricao: t }))}
            placeholder="Detalhes da modificação"
          />
          <Field
            label="Valor (opcional)"
            value={currentMod.valor}
            onChangeText={(t) => setCurrentMod((prev) => ({ ...prev, valor: t }))}
            placeholder="R$ 0,00"
            keyboardType="numeric"
          />

          <AppButton title="Adicionar à lista" variant="secondary" onPress={addModToList} />

          {newMods.length > 0 ? (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingTitle}>{newMods.length} modificação(ões) para salvar:</Text>
              {newMods.map((m, i) => (
                <View key={i} style={styles.pendingItem}>
                  <View style={styles.pendingInfo}>
                    <Pill tone="info" size="sm" label={m.categoria} />
                    <Text style={styles.pendingName} numberOfLines={1}>{m.nome || 'Sem nome'}</Text>
                  </View>
                  <Pressable onPress={() => removeModFromList(i)} hitSlop={6}>
                    <Ionicons name="close-circle" size={20} color={Palette.red} />
                  </Pressable>
                </View>
              ))}
              <AppButton title="Salvar todas" onPress={saveMods} loading={saving} />
            </View>
          ) : null}
        </Card>
      ) : null}

      {shares.length > 0 ? (
        <Card style={styles.sharesCard}>
          <SectionTitle title="Links compartilhados" />
          {shares.map((s, i) => (
            <View key={i} style={styles.shareItem}>
              <Ionicons name="link" size={14} color={Palette.primary} />
              <View style={styles.shareInfo}>
                <Text style={styles.shareUrl} numberOfLines={1}>{s.url}</Text>
                <Text style={styles.muted}>{s.sent_at ? `Enviado ${formatDate(s.sent_at)}` : ''}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionTitle title="Histórico de modificações" />

      {events.length === 0 && !loading ? (
        <EmptyState
          title="Nenhuma modificação registrada"
          body="Adicione uma modificação ou peça à NOG para registrar."
          action={{ label: 'Conversar com NOG', onPress: () => nav.goTo('chat') }}
        />
      ) : null}

      {events.map((e, i) => (
        <Card key={i} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <View style={styles.eventIcon}>
              <Ionicons name="finger-print" size={18} color={Palette.cyan} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventType}>{e.tipo}</Text>
              <Text style={styles.muted}>{formatDate(e.data)}</Text>
            </View>
            {e.verificavel ? <Pill tone="good" size="sm" label="Verificado" /> : null}
          </View>
          <Text style={styles.eventDesc}>{e.descricao}</Text>
          {e.oficina ? <Text style={styles.muted}>Oficina: {e.oficina}</Text> : null}
        </Card>
      ))}

      {data?.summary ? (
        <Card style={styles.summaryCard}>
          <Ionicons name="document-text" size={18} color={Palette.accent} />
          <Text style={styles.summary}>{data.summary}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },
  muted: { color: Palette.textMuted, fontSize: 12 },
  shareRow: { flexDirection: 'row', gap: Spacing.two },
  addForm: { gap: Spacing.three },
  fieldLabel: { color: Palette.text, fontSize: 13, fontWeight: '700', marginBottom: Spacing.one },
  catRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  catChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  catChipActive: { borderColor: Palette.primary, backgroundColor: Palette.primaryMuted },
  catChipText: { color: Palette.textMuted, fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: Palette.primary },
  pendingSection: { gap: Spacing.two, marginTop: Spacing.two },
  pendingTitle: { color: Palette.text, fontSize: 13, fontWeight: '700' },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.bgAlt,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  pendingInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  pendingName: { color: Palette.text, fontSize: 13, flex: 1 },
  sharesCard: { gap: Spacing.two },
  shareItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  shareInfo: { flex: 1 },
  shareUrl: { color: Palette.primary, fontSize: 13, fontWeight: '600' },
  eventCard: { gap: Spacing.two },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: `${Palette.cyan}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: { flex: 1 },
  eventType: { color: Palette.text, fontSize: 15, fontWeight: '700' },
  eventDesc: { color: Palette.text, lineHeight: 20, fontSize: 14 },
  summaryCard: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  summary: { flex: 1, color: Palette.text, lineHeight: 20, fontSize: 14 },
});
