import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing, Fonts } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type AutoEvent = {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  venue_name?: string;
  city?: string;
  state?: string;
  status?: string;
  status_label?: string;
  source?: string;
  event_url?: string;
};

const CATEGORIAS = ['', 'feira', 'encontro', 'competicao', 'exposicao', 'congresso'];
const PERIODOS = [
  { value: '', label: 'Todos' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'ano', label: '1 ano' },
];

type EventsScreenProps = {
  goTo: (tab: AppTab) => void;
};

export function EventsScreen({ goTo }: EventsScreenProps) {
  const { request } = useAuth();
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [events, setEvents] = useState<AutoEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoria) params.set('categoria', categoria);
      if (periodo) params.set('periodo', periodo);
      const qs = params.toString();
      const data = await request<{ events: AutoEvent[] }>(`/api/events/automotive${qs ? `?${qs}` : ''}`);
      setEvents(data.events || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  }, [request, q, categoria, periodo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card style={styles.filters}>
        <Text style={styles.title}>Eventos automotivos</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar por nome ou cidade"
          placeholderTextColor={Palette.textSoft}
          style={styles.input}
        />
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chips}>
          {CATEGORIAS.map((c) => (
            <Pressable
              key={c || 'todas'}
              onPress={() => setCategoria(c)}
              style={[styles.chip, categoria === c ? styles.chipActive : null]}>
              <Text style={[styles.chipText, categoria === c ? styles.chipTextActive : null]}>
                {c ? c : 'Todas'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Período</Text>
        <View style={styles.chips}>
          {PERIODOS.map((p) => (
            <Pressable
              key={p.value || 'todos'}
              onPress={() => setPeriodo(p.value)}
              style={[styles.chip, periodo === p.value ? styles.chipActive : null]}>
              <Text style={[styles.chipText, periodo === p.value ? styles.chipTextActive : null]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <AppButton title="Buscar" onPress={load} loading={loading} />
      </Card>

      {loading ? (
        <ActivityIndicator color={Palette.primary} />
      ) : events.length ? (
        events.map((ev, index) => (
          <Card key={ev.id || index} style={styles.event}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{ev.title || 'Evento'}</Text>
              {ev.status ? (
                <Pill tone={toneFromStatus(ev.status)} label={ev.status_label || ev.status} />
              ) : null}
            </View>
            <Text style={styles.muted}>{[ev.city, ev.state].filter(Boolean).join(' - ')}</Text>
            {ev.start_date ? <Text style={styles.muted}>Início: {formatDate(ev.start_date)}</Text> : null}
            {ev.venue_name ? <Text style={styles.muted}>{ev.venue_name}</Text> : null}
            {ev.source ? <Text style={styles.source}>Fonte: {ev.source}</Text> : null}
            {ev.event_url ? (
              <AppButton title="Ver evento" variant="ghost" onPress={() => ev.event_url && Linking.openURL(ev.event_url)} />
            ) : null}
          </Card>
        ))
      ) : (
        <EmptyState title="Nenhum evento" body="Ajuste os filtros para encontrar feiras, encontros e competições." />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton title="Voltar" variant="ghost" onPress={() => goTo('more')} />
    </ScrollView>
  );
}

function toneFromStatus(status?: string): 'neutral' | 'good' | 'warn' | 'danger' | 'info' {
  const s = String(status || '').toLowerCase();
  if (s.includes('cancel')) return 'danger';
  if (s.includes('ongoing') || s.includes('acontec')) return 'good';
  if (s.includes('finished') || s.includes('encer')) return 'neutral';
  return 'info';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  filters: {
    gap: Spacing.two,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
    color: Palette.text,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  label: {
    color: Palette.text,
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    color: Palette.text,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  chipTextActive: {
    color: Palette.white,
  },
  event: {
    gap: Spacing.two,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  eventTitle: {
    color: Palette.text,
    fontSize: 17,
    fontFamily: Fonts.serif,
    fontWeight: '900',
    flex: 1,
  },
  muted: {
    color: Palette.textMuted,
    lineHeight: 20,
  },
  source: {
    color: Palette.textMuted,
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  error: {
    color: Palette.red,
    lineHeight: 20,
  },
});
