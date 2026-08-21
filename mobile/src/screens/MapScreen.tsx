import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { ApiError, apiRequest } from '@/lib/api';
import * as Location from 'expo-location';
import type { AppTab } from './AppShell';

type Mech = {
  id: string;
  nome: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  latitude?: number | string;
  longitude?: number | string;
  telefone?: string;
  website?: string;
  avaliacao_media?: number;
  total_avaliacoes?: number;
  especialidades?: string[];
  distance_km?: number;
};

type MechResponse = { success: boolean; mechanics: Mech[] };

export function MapScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const [mechanics, setMechanics] = useState<Mech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadAround = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<MechResponse>(
        `/api/mechanics/search?${new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '15', sort_by: 'distance' })}`,
      );
      setMechanics(
        (res.mechanics || []).filter((m) => m.latitude != null && m.longitude != null),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar mecânicos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocError('Permissao de localizacao negada.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;
        if (!cancelled) {
          setCoords({ lat: latitude, lng: longitude });
          await loadAround(latitude, longitude);
        }
      } catch {
        if (!cancelled) {
          setError('Nao foi possivel obter sua localizacao.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAround]);

  if (locError) {
    return (
      <EmptyState
        title="Localizacao"
        message={locError}
        action={{ label: 'Voltar', onPress: () => goTo('more') }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mecanicos proximos</Text>
        <Text style={styles.subtitle}>
          {coords ? 'Ordenado por distancia da sua localizacao' : 'Obtendo sua localizacao...'}
        </Text>
      </View>

      {loading && mechanics.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
          <Text style={styles.loadingText}>Carregando mecanicos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {mechanics.length === 0 && !loading ? (
            <EmptyState title="Nenhum mecanico" message="Nao encontramos oficinas proximas." />
          ) : null}
          {mechanics.map((m) => (
            <Card key={m.id} style={styles.item}>
              <View style={styles.itemHead}>
                <Text style={styles.name}>{m.nome}</Text>
                {typeof m.distance_km === 'number' ? (
                  <Pill tone="info">{m.distance_km.toFixed(1)} km</Pill>
                ) : null}
              </View>
              <Text style={styles.meta}>
                {[m.cidade, m.estado].filter(Boolean).join(' · ')}
                {m.endereco ? `\n${m.endereco}` : ''}
              </Text>
              {typeof m.avaliacao_media === 'number' ? (
                <Text style={styles.meta}>
                  ★ {m.avaliacao_media.toFixed(1)}
                  {typeof m.total_avaliacoes === 'number' ? ` (${m.total_avaliacoes})` : ''}
                </Text>
              ) : null}
              {Array.isArray(m.especialidades) && m.especialidades.length > 0 ? (
                <View style={styles.tags}>
                  {m.especialidades.slice(0, 4).map((s, i) => (
                    <Pill key={i} tone="neutral">
                      {s}
                    </Pill>
                  ))}
                </View>
              ) : null}
              <View style={styles.actions}>
                {m.telefone ? (
                  <AppButton variant="secondary" onPress={() => Linking.openURL(`tel:${m.telefone}`)}>
                    Ligar
                  </AppButton>
                ) : null}
                {m.website ? (
                  <AppButton variant="ghost" onPress={() => Linking.openURL(m.website!)}>
                    Site
                  </AppButton>
                ) : null}
              </View>
            </Card>
          ))}
          <AppButton variant="ghost" onPress={() => goTo('more')} fullWidth>
            Voltar
          </AppButton>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: { padding: Spacing.four, gap: Spacing.one },
  title: { color: Palette.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: Palette.textMuted, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  loadingText: { color: Palette.textMuted, fontSize: 14 },
  list: { padding: Spacing.four, gap: Spacing.three },
  item: { gap: Spacing.two },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  name: { color: Palette.text, fontSize: 16, fontWeight: '800', flex: 1 },
  meta: { color: Palette.textMuted, fontSize: 13, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  error: { color: Palette.red, fontSize: 13, marginBottom: Spacing.two },
});
