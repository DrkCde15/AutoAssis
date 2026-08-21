import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Field } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { apiRequest } from '@/lib/api';
import type { AppTab } from './AppShell';

export function FeedbackScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!comentario.trim()) {
      setError('O comentario e obrigatorio.');
      return;
    }
    setSending(true);
    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: {
          nome: nome.trim(),
          email: email.trim(),
          estrelas,
          comentario: comentario.trim(),
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar feedback.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <EmptyState
        title="Obrigado!"
        message="Seu feedback foi enviado com sucesso."
        action={{ label: 'Enviar outro', onPress: () => { setDone(false); setComentario(''); } }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Feedback</Text>
      <Text style={styles.subtitle}>Conte o que achou do AutoAssist. Sua opiniiao ajuda a melhorar.</Text>

      <Card>
        <Text style={styles.label}>Avaliacao</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => setEstrelas(s)} hitSlop={6}>
              <Text style={[styles.star, s <= estrelas ? styles.starOn : null]}>★</Text>
            </Pressable>
          ))}
          <Text style={styles.starLabel}>{estrelas}/5</Text>
        </View>

        <Field label="Nome (opcional)" value={nome} onChangeText={setNome} placeholder="Seu nome" />
        <Field label="Email (opcional)" value={email} onChangeText={setEmail} placeholder="voce@email.com" />
        <Field
          label="Comentario *"
          value={comentario}
          onChangeText={setComentario}
          placeholder="O que podemos melhorar?"
          multiline
        />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton variant="primary" onPress={submit} disabled={sending} fullWidth>
        {sending ? 'Enviando...' : 'Enviar feedback'}
      </AppButton>

      <AppButton variant="ghost" onPress={() => goTo('more')}>
        Voltar
      </AppButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Palette.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: Palette.textMuted, fontSize: 14 },
  label: { color: Palette.text, fontSize: 14, fontWeight: '600', marginBottom: Spacing.one },
  stars: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  star: { fontSize: 32, color: Palette.border },
  starOn: { color: Palette.amber },
  starLabel: { color: Palette.textMuted, fontSize: 14, marginLeft: Spacing.two },
  error: { color: Palette.red, fontSize: 14 },
});
