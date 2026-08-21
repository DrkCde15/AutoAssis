import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  Map as MapLibreMap,
  Marker,
  UserLocation,
  type CameraRef,
  type MapRef,
  type StyleSpecification,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { AppButton, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { ApiError, apiRequest } from '@/lib/api';
import * as Location from 'expo-location';
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

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const BRAZIL_CENTER: [number, number] = [-47.882778, -15.793889];

export function MapScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const [mechanics, setMechanics] = useState<MechMarker[]>([]);
  const [events, setEvents] = useState<EventMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const regionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const center: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        if (!cancelled) {
          setUserLocation(center);
          cameraRef.current?.flyTo({ center, zoom: 12, duration: 800 });
          await loadAround(pos.coords.latitude, pos.coords.longitude);
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
      if (regionTimeout.current) clearTimeout(regionTimeout.current);
    };
  }, [loadAround]);

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const center = event.nativeEvent.center;
    if (!center || center.length < 2) return;
    if (regionTimeout.current) clearTimeout(regionTimeout.current);
    regionTimeout.current = setTimeout(() => {
      loadAround(center[1], center[0]);
    }, 600);
  };

  const centerOnUser = () => {
    if (!userLocation) return;
    cameraRef.current?.flyTo({ center: userLocation, zoom: 12, duration: 800 });
    loadAround(userLocation[1], userLocation[0]);
  };

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
      <MapLibreMap
        ref={mapRef}
        mapStyle={OSM_STYLE}
        style={styles.map}
        onRegionDidChange={handleRegionDidChange}>
        <Camera ref={cameraRef} initialViewState={{ center: BRAZIL_CENTER, zoom: 3 }} />
        <UserLocation />
        {mechanics.map((m) => (
          <Marker
            key={`m-${m.id}`}
            id={`m-${m.id}`}
            lngLat={[Number(m.longitude), Number(m.latitude)]}
            onPress={() => m.telefone && Linking.openURL(`tel:${m.telefone}`)}>
            <View style={styles.dotBlue} />
          </Marker>
        ))}
        {events.map((e) => (
          <Marker
            key={`e-${e.id}`}
            id={`e-${e.id}`}
            lngLat={[Number(e.longitude), Number(e.latitude)]}
            onPress={() => e.event_url && Linking.openURL(e.event_url)}>
            <View style={styles.dotRed} />
          </Marker>
        ))}
      </MapLibreMap>

      <View style={styles.legend}>
        <Pill tone="info">Azul: Mecanicos</Pill>
        <Pill tone="danger">Vermelho: Eventos</Pill>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <AppButton variant="secondary" onPress={centerOnUser}>
            Centralizar
          </AppButton>
          <AppButton variant="ghost" onPress={() => goTo('more')}>
            Voltar
          </AppButton>
        </View>
      </View>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg, gap: Spacing.two },
  loadingText: { color: Palette.textMuted, fontSize: 14 },
  legend: { position: 'absolute', bottom: Spacing.four, left: Spacing.four, right: Spacing.four, gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  error: { color: Palette.red, fontSize: 13 },
  dotBlue: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Palette.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dotRed: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Palette.red,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  attribution: {
    position: 'absolute',
    bottom: 2,
    right: Spacing.two,
    color: Palette.textMuted,
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
