import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Pill, SectionTitle } from '@/components/primitives';
import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type AutoEvent = {
  id?: string;
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  categoria?: string;
  categoria_label?: string;
  data_inicio?: string;
  data_fim?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  venue_name?: string;
  local?: string;
  address?: string;
  cidade?: string;
  city?: string;
  uf?: string;
  state?: string;
  status?: string;
  fonte?: string;
  fonte_nome?: string;
  source?: string;
  event_url?: string;
  url?: string;
  image_url?: string;
  organizer?: string;
  confidence?: number;
};

const CATEGORIAS = [
  { value: '', label: 'Todas', icon: 'grid' as const },
  { value: 'feira', label: 'Feira', icon: 'business' as const, color: Palette.amber },
  { value: 'encontro', label: 'Encontro', icon: 'people' as const, color: Palette.cyan },
  { value: 'competicao', label: 'Competição', icon: 'trophy' as const, color: Palette.red },
  { value: 'exposicao', label: 'Exposição', icon: 'eye' as const, color: Palette.green },
  { value: 'congresso', label: 'Congresso', icon: 'school' as const, color: Palette.primary },
];

const PERIODOS = [
  { value: '', label: 'Todos' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'ano', label: '1 ano' },
];

const CAT_COLOR: Record<string, string> = {
  feira: Palette.amber,
  encontro: Palette.cyan,
  competicao: Palette.red,
  exposicao: Palette.green,
  congresso: Palette.primary,
};

const CAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  feira: 'business',
  encontro: 'people',
  competicao: 'trophy',
  exposicao: 'eye',
  congresso: 'school',
  outros: 'ellipsis-horizontal',
};

function resolveEvent(ev: AutoEvent): AutoEvent {
  return {
    ...ev,
    titulo: ev.titulo ?? ev.title,
    descricao: ev.descricao ?? ev.description,
    data_inicio: ev.data_inicio ?? ev.start_date,
    data_fim: ev.data_fim ?? ev.end_date,
    cidade: ev.cidade ?? ev.city,
    uf: ev.uf ?? ev.state,
    event_url: ev.event_url ?? ev.url,
    fonte: ev.fonte ?? ev.source,
  };
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoria) params.set('categoria', categoria);
      if (periodo) params.set('periodo', periodo);
      const qs = params.toString();
      const data = await request<{ events: AutoEvent[] }>(`/api/events/automotive${qs ? `?${qs}` : ''}`);
      setEvents((data.events || []).map(resolveEvent));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar eventos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request, q, categoria, periodo]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const locationOf = (ev: AutoEvent) => {
    const parts = [ev.cidade, ev.uf].filter(Boolean);
    return parts.join(' - ');
  };

  const dateRange = (ev: AutoEvent) => {
    const s = ev.data_inicio;
    const e = ev.data_fim;
    if (s && e && s !== e) return `${formatDate(s)} a ${formatDate(e)}`;
    if (s) return formatDate(s);
    return null;
  };

  const timeRange = (ev: AutoEvent) => {
    if (ev.start_time && ev.end_time) return `${ev.start_time} - ${ev.end_time}`;
    if (ev.start_time) return ev.start_time;
    return null;
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <SectionTitle
        kicker="Calendário"
        title="Eventos automotivos"
        subtitle="Feiras, encontros, competições e exposições do Brasil."
      />

      <Card style={styles.filters}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar por nome ou cidade..."
          placeholderTextColor={Palette.textSoft}
          style={styles.input}
        />
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chips}>
          {CATEGORIAS.map((c) => (
            <Pressable
              key={c.value || 'todas'}
              onPress={() => setCategoria(c.value)}
              style={[
                styles.chip,
                categoria === c.value ? styles.chipActive : null,
                categoria === c.value && c.color ? { backgroundColor: c.color, borderColor: c.color } : null,
              ]}>
              <Ionicons
                name={c.icon}
                size={13}
                color={categoria === c.value ? Palette.white : Palette.textMuted}
                style={styles.chipIcon}
              />
              <Text
                style={[
                  styles.chipText,
                  categoria === c.value ? styles.chipTextActive : null,
                ]}>
                {c.label}
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
        <AppButton title="Buscar" onPress={() => load()} loading={loading} />
      </Card>

      {loading && !refreshing ? (
        <ActivityIndicator color={Palette.primary} style={styles.loader} />
      ) : events.length ? (
        events.map((ev, index) => {
          const cat = ev.categoria || 'outros';
          const catColor = CAT_COLOR[cat] || Palette.textMuted;
          const catIcon = CAT_ICON[cat] || 'ellipsis-horizontal';
          const catLabel = ev.categoria_label || cat;
          const loc = locationOf(ev);
          const dr = dateRange(ev);
          const tr = timeRange(ev);

          return (
            <Card key={ev.id || index} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.catIcon, { backgroundColor: `${catColor}18` }]}>
                  <Ionicons name={catIcon} size={20} color={catColor} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {ev.titulo || 'Evento'}
                    </Text>
                    {ev.status ? (
                      <Pill tone={toneFromStatus(ev.status)} size="sm" label={statusLabel(ev.status)} />
                    ) : null}
                  </View>
                  {catLabel ? (
                    <Pill tone="neutral" size="sm" label={catLabel} />
                  ) : null}
                </View>
              </View>

              <View style={styles.details}>
                {dr ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color={Palette.textMuted} />
                    <Text style={styles.detailText}>{dr}</Text>
                  </View>
                ) : null}
                {tr ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={Palette.textMuted} />
                    <Text style={styles.detailText}>{tr}</Text>
                  </View>
                ) : null}
                {loc ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={Palette.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>{loc}</Text>
                  </View>
                ) : null}
                {ev.venue_name ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="map-outline" size={14} color={Palette.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>{ev.venue_name}</Text>
                  </View>
                ) : null}
                {ev.address ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="navigate-outline" size={14} color={Palette.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>{ev.address}</Text>
                  </View>
                ) : null}
                {ev.organizer ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={14} color={Palette.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>{ev.organizer}</Text>
                  </View>
                ) : null}
              </View>

              {ev.descricao ? (
                <Text style={styles.description} numberOfLines={3}>{ev.descricao}</Text>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.sourceRow}>
                  <Pill tone="neutral" size="sm" label={ev.fonte_nome || ev.fonte || 'web'} />
                  {ev.confidence != null && ev.confidence > 0 ? (
                    <Text style={styles.confidence}>
                      {Math.round(ev.confidence * 100)}% confiança
                    </Text>
                  ) : null}
                </View>
                {ev.event_url ? (
                  <AppButton
                    title="Ver evento"
                    variant="primary"
                    size="sm"
                    onPress={() => ev.event_url && Linking.openURL(ev.event_url)}
                  />
                ) : null}
              </View>
            </Card>
          );
        })
      ) : (
        <EmptyState
          title="Nenhum evento encontrado"
          body="Ajuste os filtros para encontrar feiras, encontros e competições."
          icon="calendar-outline"
          action={{ label: 'Limpar filtros', onPress: () => { setQ(''); setCategoria(''); setPeriodo(''); } }}
        />
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
  if (s.includes('upcoming') || s.includes('proxim')) return 'info';
  return 'info';
}

function statusLabel(status?: string): string {
  const s = String(status || '').toLowerCase();
  if (s.includes('cancel')) return 'Cancelado';
  if (s.includes('ongoing') || s.includes('acontec')) return 'Acontecendo';
  if (s.includes('finished') || s.includes('encer')) return 'Encerrado';
  if (s.includes('upcoming') || s.includes('proxim')) return 'Próximo';
  return s || 'Indefinido';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  loader: { paddingVertical: Spacing.six },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },

  filters: { gap: Spacing.three },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceStrong,
    color: Palette.text,
    paddingHorizontal: Spacing.four,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  label: {
    color: Palette.textMuted,
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipIcon: { marginRight: 4 },
  chipText: {
    color: Palette.textMuted,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  chipTextActive: { color: Palette.white },

  card: { gap: Spacing.three, ...Shadow.sm },
  cardTop: { flexDirection: 'row', gap: Spacing.three },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: Spacing.one },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    color: Palette.text,
    fontSize: 17,
    fontFamily: Fonts.serif,
    fontWeight: '900',
    flex: 1,
    lineHeight: 22,
  },

  details: { gap: Spacing.one + 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  detailText: {
    color: Palette.textMuted,
    fontSize: 13,
    fontFamily: Fonts.sans,
    flex: 1,
  },

  description: {
    color: Palette.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  confidence: {
    color: Palette.textSoft,
    fontSize: 11,
    fontFamily: Fonts.sans,
  },
});
