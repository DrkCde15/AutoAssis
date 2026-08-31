import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AppButton, Card, Field, SectionTitle } from '@/components/primitives';
import { Palette, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

export function SecurityScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function changePassword() {
    if (!current || !password) {
      setMessage('Preencha todos os campos.');
      return;
    }
    if (password !== confirm) {
      setMessage('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await request('/api/user/password', { method: 'PUT', body: { current_password: current, new_password: password } });
      setMessage('Senha alterada com sucesso.');
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionTitle kicker="Segurança" title="Alterar senha" subtitle="Mantenhe sua conta segura." />
      <Card style={styles.card}>
        <Field label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry placeholder="Sua senha atual" />
        <Field label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="Nova senha" />
        <Field label="Confirmar" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repita a nova senha" />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <AppButton title="Alterar senha" onPress={changePassword} loading={saving} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  card: { gap: Spacing.three, ...Shadow.sm },
  message: { color: Palette.primary, fontSize: 13, fontWeight: '600' },
});
