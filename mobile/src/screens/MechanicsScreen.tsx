import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { AppButton, Card, EmptyState, Pill, SectionTitle } from '@/components/primitives';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type Mechanic = {
  id: number;
  nome: string;
  reputacao?: string;
  avaliacao_media?: number;
  especialidades?: string[];
  endereco?: string;
  telefone?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  _source?: string;
};

export function MechanicsScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request } = useAuth();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    setLocationStatus('loading');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setError('Permissão de localização necessária para encontrar mecânicos próximos.');
        setRefreshing(false);
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationStatus('ok');

      const data = await request<{ mechanics: Mechanic[] }>(
        `/api/mechanics/search?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&radius=20&limit=20`
      );
      setMechanics(data.mechanics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mecânicos.');
      setMechanics([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function openMaps(m: Mechanic) {
    const q = m.latitude && m.longitude
      ? `${m.latitude},${m.longitude}`
      : encodeURIComponent(m.endereco || m.nome);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  }

  function call(m: Mechanic) {
    if (m.telefone) Linking.openURL(`tel:${m.telefone}`).catch(() => {});
  }

  function askNog(m: Mechanic) {
    goTo('chat');
  }

  function rating(m: Mechanic): string {
    const num = Number(m.avaliacao_media);
    if (!Number.isNaN(num) && num > 0) return num.toFixed(1);
    if (m.reputacao) return String(m.reputacao);
    return '';
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <SectionTitle
        kicker="Oficinas"
        title="Mecânicos próximos"
        subtitle="Encontre profissionais confiáveis para seu veículo."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {locationStatus === 'denied' ? (
        <Card style={styles.promptCard}>
          <Ionicons name="location-outline" size={28} color={Palette.amber} />
          <Text style={styles.promptText}>
            Ative a localização para encontrar mecânicos perto de você.
          </Text>
          <AppButton title="Abrir configurações" variant="secondary" onPress={() => Linking.openSettings()} />
        </Card>
      ) : null}

      {!loading && mechanics.length === 0 && locationStatus !== 'denied' ? (
        <EmptyState
          title="Nenhuma oficina encontrada"
          body="Amplie o raio de busca ou tente mais tarde."
          action={{ label: 'Tentar novamente', onPress: load }}
        />
      ) : null}

      {mechanics.map((m) => {
        const r = rating(m);
        return (
          <Card key={m.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="construct" size={20} color={Palette.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{m.nome}</Text>
                {m.endereco ? <Text style={styles.address} numberOfLines={1}>{m.endereco}</Text> : null}
                {r ? (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={13} color={Palette.amber} />
                    <Text style={styles.ratingText}>{r}</Text>
                  </View>
                ) : null}
              </View>
              {m.distance_km != null ? (
                <Pill tone="info" size="sm" label={`${m.distance_km} km`} />
              ) : null}
            </View>

            {m.especialidades && m.especialidades.length > 0 ? (
              <View style={styles.specialties}>
                {m.especialidades.map((e, i) => (
                  <Pill key={i} size="sm" tone="neutral" label={e} />
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              <AppButton title="NOG" variant="ghost" size="sm" onPress={() => askNog(m)} />
              {m.telefone ? <AppButton title="Ligar" variant="secondary" size="sm" onPress={() => call(m)} /> : null}
              <AppButton title="Maps" variant="primary" size="sm" onPress={() => openMaps(m)} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },
  promptCard: { gap: Spacing.three, alignItems: 'center' },
  promptText: { color: Palette.text, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { gap: Spacing.three },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.one },
  name: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  address: { color: Palette.textMuted, fontSize: 13 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Palette.amber, fontSize: 12, fontWeight: '700' },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
