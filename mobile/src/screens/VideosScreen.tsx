import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing, Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { LinkItem, VideoItem } from '@/lib/types';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type LibraryEntry = {
  topic: string;
  videos: VideoItem[];
  links: LinkItem[];
  last_updated?: string;
};

type VideosScreenProps = {
  goTo: (tab: AppTab) => void;
};

export function VideosScreen({ goTo }: VideosScreenProps) {
  const { request } = useAuth();
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [premiumBlocked, setPremiumBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<{ library: LibraryEntry[] }>('/api/videos/library');
      setLibrary(data.library || []);
      setPremiumBlocked(false);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
        setPremiumBlocked(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar biblioteca.');
      }
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function openCheckout() {
    try {
      const data = await request<{ checkout_url?: string; data?: { checkout_url?: string } }>('/api/pay/preference', {
        method: 'POST',
        body: {},
      });
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
      }
    } catch {
      // ignora falha de checkout
    }
  }

  if (premiumBlocked) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Card style={styles.locked}>
          <Pill label="Premium" tone="info" />
          <Text style={styles.title}>Biblioteca NOG</Text>
          <Text style={styles.muted}>
            Seus vídeos e links recomendados pelo assistente ficam salvos aqui, com acesso exclusivo do plano Premium.
          </Text>
          <AppButton title="Ativar Premium" onPress={openCheckout} />
          <AppButton title="Voltar" variant="ghost" onPress={() => goTo('more')} />
        </Card>
      </ScrollView>
    );
  }

  const items = library.map((entry) => ({
    ...entry,
    assets: [...(entry.videos || []), ...(entry.links || [])].filter((item) => item.url),
  }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {loading ? (
        <ActivityIndicator color={Palette.primary} />
      ) : items.length ? (
        items.map((entry) => (
          <Card key={entry.topic} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{entry.topic}</Text>
              {entry.last_updated ? (
                <Text style={styles.date}>{formatDate(entry.last_updated)}</Text>
              ) : null}
            </View>
            {entry.assets.map((item, index) => (
              <Pressable
                key={`${item.url}-${index}`}
                onPress={() => item.url && Linking.openURL(item.url)}
                style={styles.item}>
                <Text style={styles.itemTitle}>{item.titulo || 'Abrir recomendação'}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.url}
                </Text>
              </Pressable>
            ))}
          </Card>
        ))
      ) : (
        <EmptyState
          title="Biblioteca vazia"
          body="Converse com o NOG para receber vídeos e links; eles aparecem organizados por tema aqui."
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton title="Voltar" variant="ghost" onPress={() => goTo('more')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  locked: {
    gap: Spacing.two,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  muted: {
    color: Palette.textMuted,
    lineHeight: 20,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitle: {
    color: Palette.text,
    fontSize: 18,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  date: {
    color: Palette.textMuted,
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  item: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  itemTitle: {
    color: Palette.blue,
    fontWeight: '700',
  },
  itemMeta: {
    color: Palette.textMuted,
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  error: {
    color: Palette.red,
    lineHeight: 20,
  },
});
