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

// Usada apenas quando o usuário nunca permitiu a localização: ainda trazemos
// os dados do banco (com uma coordenada padrão) em vez de quebrar a tela.
const FALLBACK_LOCATION = { lat: -15.793889, lng: -47.882778 };

export function MapScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const [mechanics, setMechanics] = useState<Mech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realLocation, setRealLocation] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);

  const loadAround = useCallback(async (lat: number, lng: number, isReal: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<MechResponse>(
        `/api/mechanics/search?${new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '15', sort_by: 'distance' })}`,
      );
      setMechanics(
        (res.mechanics || []).filter((m) => m.latitude != null && m.longitude != null),
      );
      setRealLocation(isReal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar mecânicos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const enableLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNeedsLocation(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setNeedsLocation(false);
      await loadAround(pos.coords.latitude, pos.coords.longitude, true);
    } catch {
      setError('Nao foi possivel obter sua localizacao.');
    }
  }, [loadAround]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          if (!cancelled) await loadAround(pos.coords.latitude, pos.coords.longitude, true);
        } else {
          // Usuário nunca permitiu: traz os dados do banco mesmo assim.
          if (!cancelled) {
            setNeedsLocation(true);
            await loadAround(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng, false);
          }
        }
      } catch {
        if (!cancelled) {
          setNeedsLocation(true);
          await loadAround(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng, false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAround]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mecanicos proximos</Text>
        <Text style={styles.subtitle}>
          {realLocation
            ? 'Ordenado por distancia da sua localizacao'
            : 'Permita a localizacao para ver os mais proximos de voce'}
        </Text>
      </View>

      {loading && mechanics.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
          <Text style={styles.loadingText}>Carregando mecanicos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {needsLocation && !realLocation ? (
            <Card style={styles.banner}>
              <Text style={styles.bannerText}>
                Permita a localizacao para ver os mecanicos mais proximos de voce.
              </Text>
              <AppButton variant="secondary" onPress={enableLocation}>
                Usar minha localizacao
              </AppButton>
            </Card>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {mechanics.length === 0 && !loading ? (
            <EmptyState title="Nenhum mecanico" message="Nao encontramos oficinas proximas." />
          ) : null}
          {mechanics.map((m) => (
            <Card key={m.id} style={styles.item}>
              <View style={styles.itemHead}>
                <Text style={styles.name}>{m.nome}</Text>
                {realLocation && typeof m.distance_km === 'number' ? (
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
  banner: { gap: Spacing.two, backgroundColor: Palette.surfaceStrong },
  bannerText: { color: Palette.text, fontSize: 14, lineHeight: 20 },
  item: { gap: Spacing.two },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  name: { color: Palette.text, fontSize: 16, fontWeight: '800', flex: 1 },
  meta: { color: Palette.textMuted, fontSize: 13, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  error: { color: Palette.red, fontSize: 13, marginBottom: Spacing.two },
});
