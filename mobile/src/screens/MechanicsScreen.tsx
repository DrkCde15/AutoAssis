import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Field, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { ApiError, apiRequest } from '@/lib/api';
import * as Location from 'expo-location';
import type { AppTab } from './AppShell';

type Mechanic = {
  id: string | number;
  nome: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
  telefone?: string;
  website?: string;
  avaliacao_media?: number | null;
  total_avaliacoes?: number;
  especialidades?: string[];
  distance_km?: number;
  _source?: string;
};

type MechanicsResponse = { success: boolean; count: number; mechanics: Mechanic[] };

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'distance', label: 'Distancia' },
  { key: 'rating', label: 'Avaliacao' },
  { key: 'name', label: 'Nome' },
];

export function MechanicsScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [radius, setRadius] = useState('10');
  const [serviceType, setServiceType] = useState('');
  const [sortBy, setSortBy] = useState('distance');

  const requestLocation = useCallback(async () => {
    setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Permissao de localizacao negada. Nao e possivel buscar oficinas proximas.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocError('Nao foi possivel obter sua localizacao.');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const fetchMechanics = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radius,
        sort_by: sortBy,
      });
      if (serviceType.trim()) params.set('service_type', serviceType.trim());
      const data = await apiRequest<MechanicsResponse>(
        `/api/mechanics/search?${params.toString()}`,
      );
      setMechanics(data.mechanics || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao buscar mecanicos.');
      setMechanics([]);
    } finally {
      setLoading(false);
    }
  }, [coords, radius, serviceType, sortBy]);

  useEffect(() => {
    if (coords) fetchMechanics();
  }, [coords, fetchMechanics]);

  if (locError) {
    return (
      <EmptyState
        title="Localizacao"
        message={locError}
        action={{ label: 'Tentar de novo', onPress: requestLocation }}
      />
    );
  }

  if (!coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.primary} />
        <Text style={styles.loadingText}>Obtendo sua localizacao...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Mecanicos proximos</Text>

      <Card>
        <Field
          label="Raio (km)"
          value={radius}
          onChangeText={setRadius}
          placeholder="10"
        />
        <Field
          label="Tipo de servico (opcional)"
          value={serviceType}
          onChangeText={setServiceType}
          placeholder="ex.: eletrica"
        />
        <Text style={styles.label}>Ordenar por</Text>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((o) => (
            <Pressable
              key={o.key}
              onPress={() => setSortBy(o.key)}
              style={[styles.sortPill, sortBy === o.key ? styles.sortPillOn : null]}>
              <Text style={[styles.sortText, sortBy === o.key ? styles.sortTextOn : null]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <AppButton variant="secondary" onPress={fetchMechanics} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </AppButton>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={Palette.primary} />
      ) : mechanics.length === 0 ? (
        <EmptyState
          title="Nenhum mecanico encontrado"
          message="Tente aumentar o raio de busca."
          action={{ label: 'Buscar novamente', onPress: fetchMechanics }}
        />
      ) : (
        mechanics.map((m) => (
          <Card key={String(m.id)}>
            <Text style={styles.name}>{m.nome}</Text>
            {m.endereco ? <Text style={styles.meta}>{m.endereco}</Text> : null}
            <Text style={styles.meta}>
              {[m.cidade, m.estado].filter(Boolean).join(' · ')}
              {typeof m.distance_km === 'number' ? ` · ${m.distance_km.toFixed(1)} km` : ''}
            </Text>
            {typeof m.avaliacao_media === 'number' ? (
              <Pill tone="warn">★ {m.avaliacao_media.toFixed(1)} ({m.total_avaliacoes ?? 0})</Pill>
            ) : (
              <Pill tone="neutral">Sem avaliacao</Pill>
            )}

            {m.especialidades && m.especialidades.length > 0 ? (
              <View style={styles.tags}>
                {m.especialidades.map((s, i) => (
                  <Pill key={i} tone="info">
                    {s}
                  </Pill>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              {m.telefone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${m.telefone}`)} style={styles.link}>
                  <Text style={styles.linkText}>Ligar</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => goTo('map')} style={styles.link}>
                <Text style={styles.linkText}>Ver no mapa</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <AppButton variant="ghost" onPress={() => goTo('more')}>
        Voltar
      </AppButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg, gap: Spacing.two },
  loadingText: { color: Palette.textMuted, fontSize: 14 },
  container: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Palette.text, fontSize: 22, fontWeight: '700' },
  label: { color: Palette.text, fontSize: 14, fontWeight: '600', marginTop: Spacing.two, marginBottom: Spacing.one },
  sortRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three },
  sortPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: Palette.surfaceStrong },
  sortPillOn: { backgroundColor: Palette.primary },
  sortText: { color: Palette.textMuted, fontSize: 13, fontWeight: '600' },
  sortTextOn: { color: Palette.white },
  name: { color: Palette.text, fontSize: 17, fontWeight: '700' },
  meta: { color: Palette.textMuted, fontSize: 14, marginTop: Spacing.one },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
  link: { paddingVertical: 4 },
  linkText: { color: Palette.primary, fontSize: 14, fontWeight: '600' },
  error: { color: Palette.red, fontSize: 14 },
});
