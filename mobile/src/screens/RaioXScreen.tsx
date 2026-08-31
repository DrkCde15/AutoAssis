import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Pill, SectionTitle } from '@/components/primitives';
import { Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { stripMarkdown } from '@/lib/format';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

type Analysis = {
  id: string;
  uri: string;
  response: string;
  createdAt: string;
};

const DISCLAIMER =
  'Análise visual preliminar. Não substitui inspeção presencial de um profissional.';

function detectSeverity(text: string): 'ALTA' | 'MÉDIA' | 'BAIXA' | null {
  const upper = text.toUpperCase();
  if (/SEVERIDADE[:\s]*ALTA|GRAVIDADE[:\s]*ALTA|\bCRÍTIC|CRITIC/i.test(upper)) return 'ALTA';
  if (/SEVERIDADE[:\s]*M[ÉE]DIA|GRAVIDADE[:\s]*M[ÉE]DIA/i.test(upper)) return 'MÉDIA';
  if (/SEVERIDADE[:\s]*BAIXA|GRAVIDADE[:\s]*BAIXA|LEVE\b/i.test(upper)) return 'BAIXA';
  if (/ALTA\b/.test(upper)) return 'ALTA';
  return null;
}

export function RaioXScreen({ nav }: { nav: Nav }) {
  const { request } = useAuth();
  const [image, setImage] = useState<{ uri: string; base64: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function pick(source: 'camera' | 'library') {
    setError('');
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(`Permissão de ${source === 'camera' ? 'câmera' : 'galeria'} negada.`);
      return;
    }
    const result = await (source === 'camera'
      ? ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true }));

    if (!result.canceled && result.assets[0]?.base64) {
      setImage({ uri: result.assets[0].uri, base64: `data:image/jpeg;base64,${result.assets[0].base64}` });
      setResult(null);
    }
  }

  async function analyze() {
    if (!image) return;
    setAnalyzing(true);
    setProgress(8);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.random() * 14 : p));
    }, 350);
    setError('');
    try {
      const resp = await request<{ response: string; chat: { id?: number; resposta_ia?: string } }>('/api/chat', {
        method: 'POST',
        body: {
          message: 'Faça o Raio-X Mecânico desta imagem. Identifique possíveis problemas, severidade e recomende próximos passos. Deixe claro que é uma análise visual.',
          image: image.base64,
          ignore_global_history: false,
        },
      });
      const text = resp.response || resp.chat?.resposta_ia || '';
      const entry: Analysis = {
        id: String(Date.now()),
        uri: image.uri,
        response: text,
        createdAt: new Date().toISOString(),
      };
      setResult(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao analisar a imagem.');
    } finally {
      setAnalyzing(false);
      setProgress(100);
      if (timer.current) clearInterval(timer.current);
    }
  }

  const severity = result ? detectSeverity(result.response) : null;
  const severityTone = severity === 'ALTA' ? 'danger' : severity === 'MÉDIA' ? 'warn' : severity === 'BAIXA' ? 'good' : 'info';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionTitle
        kicker="Diagnóstico visual"
        title="Raio-X Mecânico"
        subtitle="Envie uma foto do problema para análise da NOG."
      />

      {!image && !result ? (
        <View style={styles.picker}>
          <AppButton title="Tirar foto" onPress={() => pick('camera')} />
          <AppButton title="Escolher da galeria" variant="secondary" onPress={() => pick('library')} />
        </View>
      ) : null}

      {image && !analyzing && !result ? (
        <Card style={styles.previewCard}>
          <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
          <View style={styles.previewActions}>
            <AppButton title="Analisar" onPress={analyze} />
            <AppButton title="Trocar" variant="ghost" onPress={() => setImage(null)} />
          </View>
        </Card>
      ) : null}

      {analyzing ? (
        <Card style={styles.analyzing}>
          <ActivityIndicator color={Palette.primary} />
          <Text style={styles.analyzingText}>Analisando imagem...</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </Card>
      ) : null}

      {result ? (
        <Card style={styles.result}>
          <Image source={{ uri: result.uri }} style={styles.resultImage} contentFit="cover" />
          {severity ? (
            <View style={styles.severityRow}>
              <Text style={styles.severityLabel}>Severidade</Text>
              <Pill tone={severityTone} label={severity} />
            </View>
          ) : null}
          <Text style={styles.resultText}>{stripMarkdown(result.response)}</Text>
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={16} color={Palette.amber} />
            <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
          </View>
          <View style={styles.resultActions}>
            <AppButton title="Encontrar mecânico" onPress={() => nav.goTo('mechanics')} />
            <AppButton title="Perguntar à NOG" variant="secondary" onPress={() => nav.goTo('chat')} />
            <AppButton title="Nova análise" variant="ghost" onPress={() => { setImage(null); setResult(null); setProgress(0); }} />
          </View>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {history.length ? (
        <View style={styles.history}>
          <SectionTitle title="Histórico" />
          {history.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setResult(item);
                setImage({ uri: item.uri, base64: '' });
              }}
              style={styles.historyItem}>
              <Image source={{ uri: item.uri }} style={styles.historyThumb} contentFit="cover" />
              <View style={styles.historyText}>
                <Text style={styles.historySnippet} numberOfLines={2}>
                  {stripMarkdown(item.response)}
                </Text>
                <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!image && !result && history.length === 0 ? (
        <EmptyState title="Nenhuma análise ainda" body="Tire uma foto de um problema para a NOG avaliar." />
      ) : null}

      <Pressable style={styles.help} onPress={() => Alert.alert('Sobre o Raio-X', DISCLAIMER)}>
        <Text style={styles.helpText}>O que é o Raio-X Mecânico?</Text>
      </Pressable>
    </ScrollView>
  );
}

void Linking;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  picker: { gap: Spacing.two },
  previewCard: { gap: Spacing.three, ...Shadow.sm },
  preview: { width: '100%', height: 200, borderRadius: Radius.lg },
  previewActions: { flexDirection: 'row', gap: Spacing.two },
  analyzing: { gap: Spacing.three, alignItems: 'center' },
  analyzingText: { color: Palette.text, fontWeight: '700', fontSize: 15 },
  track: { width: '100%', height: 6, borderRadius: 999, backgroundColor: Palette.bgAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999, backgroundColor: Palette.primary },
  progressText: { color: Palette.textMuted, fontWeight: '700', fontSize: 13 },
  result: { gap: Spacing.three },
  resultImage: { width: '100%', height: 160, borderRadius: Radius.lg },
  severityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  severityLabel: { color: Palette.text, fontWeight: '700' },
  resultText: { color: Palette.text, lineHeight: 22, fontSize: 15 },
  disclaimer: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  disclaimerText: { flex: 1, color: Palette.amber, fontSize: 12, lineHeight: 17 },
  resultActions: { gap: Spacing.two },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },
  history: { gap: Spacing.three },
  historyItem: {
    flexDirection: 'row',
    gap: Spacing.three,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    ...Shadow.sm,
  },
  historyThumb: { width: 52, height: 52, borderRadius: Radius.md },
  historyText: { flex: 1, gap: Spacing.one },
  historySnippet: { color: Palette.text, lineHeight: 18, fontSize: 13 },
  historyDate: { color: Palette.textMuted, fontSize: 12 },
  help: { alignItems: 'center', paddingVertical: Spacing.three },
  helpText: { color: Palette.primary, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
});
