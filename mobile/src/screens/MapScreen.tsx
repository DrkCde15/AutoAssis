import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { AppButton, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { ApiError, apiRequest } from '@/lib/api';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@/lib/config';
import type { AppTab } from './AppShell';

type MechMarker = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  telefone?: string;
};

type EventMarker = {
  id: string;
  titulo: string;
  latitude?: number;
  longitude?: number;
  cidade?: string;
  uf?: string;
  event_url?: string;
};

type MechanicsResponse = { success: boolean; mechanics: MechMarker[] };
type EventsResponse = { success: boolean; events: EventMarker[] };

const DEFAULT_REGION: Region = {
  latitude: -15.793889,
  longitude: -47.882778,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export function MapScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [mechanics, setMechanics] = useState<MechMarker[]>([]);
  const [events, setEvents] = useState<EventMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocError('Permissao de localizacao negada.');
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        await loadAround(pos.coords.latitude, pos.coords.longitude);
      } catch {
        setError('Nao foi possivel carregar o mapa.');
        setLoading(false);
      }
    })();
  }, []);

  const loadAround = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const [mechRes, evtRes] = await Promise.all([
        apiRequest<MechanicsResponse>(
          `/api/mechanics/search?${new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '15', sort_by: 'distance' })}`,
        ),
        apiRequest<EventsResponse>(
          `/api/events/automotive?${new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '50' })}`,
        ),
      ]);
      setMechanics(
        (mechRes.mechanics || []).filter(
          (m) => typeof m.latitude === 'number' && typeof m.longitude === 'number',
        ),
      );
      setEvents(
        (evtRes.events || []).filter(
          (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number',
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar pontos do mapa.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (locError) {
    return (
      <EmptyState
        title="Localizacao"
        message={locError}
        action={{ label: 'Voltar', onPress: () => goTo('more') }}
      />
    );
  }

  if (loading && mechanics.length === 0 && events.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.primary} />
        <Text style={styles.loadingText}>Carregando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={GOOGLE_MAPS_API_KEY ? PROVIDER_GOOGLE : undefined}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation>
        {mechanics.map((m) => (
          <Marker
            key={`m-${m.id}`}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.nome}
            description={typeof m.distance_km === 'number' ? `${m.distance_km.toFixed(1)} km` : undefined}
            pinColor="#208AEF"
            onCalloutPress={() => m.telefone && Linking.openURL(`tel:${m.telefone}`)}
          />
        ))}
        {events.map((e) => (
          <Marker
            key={`e-${e.id}`}
            coordinate={{ latitude: e.latitude as number, longitude: e.longitude as number }}
            title={e.titulo}
            description={[e.cidade, e.uf].filter(Boolean).join(' · ')}
            pinColor="#E5484D"
            onCalloutPress={() => e.event_url && Linking.openURL(e.event_url)}
          />
        ))}
      </MapView>

      <View style={styles.legend}>
        <Pill tone="info">Azul: Mecanicos</Pill>
        <Pill tone="danger">Vermelho: Eventos</Pill>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton variant="ghost" onPress={() => goTo('more')}>
          Voltar
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg, gap: Spacing.two },
  loadingText: { color: Palette.textMuted, fontSize: 14 },
  legend: { position: 'absolute', bottom: Spacing.four, left: Spacing.four, right: Spacing.four, gap: Spacing.two },
  error: { color: Palette.red, fontSize: 13 },
});
