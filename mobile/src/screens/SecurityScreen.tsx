import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Card } from '@/components/primitives';
import { Fonts, Palette, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import type { AppTab } from './AppShell';

export function SecurityScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { user, request, refreshUser } = useAuth();
  const enabled = !!user?.is_two_factor_enabled;

  const [mode, setMode] = useState<'idle' | 'enable' | 'disable'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
    setMode('idle');
    setPassword('');
    setConfirm('');
  }, [enabled]);

  async function enable() {
    setMessage('');
    if (!password) {
      setMessage('Informe a senha secundaria (min. 6 caracteres).');
      return;
    }
    setLoading(true);
    try {
      await request('/api/auth/2fa/confirm', {
        method: 'POST',
        body: { password, confirm_password: confirm },
      });
      await refreshUser();
      setMessage('2FA ativado com sucesso.');
      setMode('idle');
      setPassword('');
      setConfirm('');
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao ativar 2FA.');
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setMessage('');
    if (!password) {
      setMessage('Informe sua senha secundaria para desativar.');
      return;
    }
    setLoading(true);
    try {
      await request('/api/auth/2fa/disable', {
        method: 'POST',
        body: { password },
      });
      await refreshUser();
      setMessage('2FA desativado com sucesso.');
      setMode('idle');
      setPassword('');
      setConfirm('');
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao desativar 2FA.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Segurança</Text>
        <Text style={styles.subtitle}>
          O 2FA do AutoAssist usa uma senha secundaria. Ela e solicitada no login, junto da senha principal,
          para proteger sua conta.
        </Text>
        <View style={[styles.status, enabled ? styles.statusOn : styles.statusOff]}>
          <Text style={styles.statusText}>{enabled ? '2FA ativo' : '2FA inativo'}</Text>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {mode === 'idle' ? (
          <View style={styles.row}>
            {enabled ? (
              <AppButton title="Desativar 2FA" variant="danger" onPress={() => setMode('disable')} />
            ) : (
              <AppButton title="Ativar 2FA" onPress={() => setMode('enable')} />
            )}
          </View>
        ) : null}

        {mode === 'enable' ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Senha secundaria (min. 6 caracteres)"
              placeholderTextColor={Palette.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha secundaria"
              placeholderTextColor={Palette.textMuted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
            <AppButton title="Confirmar e ativar" onPress={enable} loading={loading} />
            <AppButton title="Cancelar" variant="ghost" onPress={() => setMode('idle')} />
          </View>
        ) : null}

        {mode === 'disable' ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Senha secundaria atual"
              placeholderTextColor={Palette.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <AppButton title="Confirmar e desativar" variant="danger" onPress={disable} loading={loading} />
            <AppButton title="Cancelar" variant="ghost" onPress={() => setMode('idle')} />
          </View>
        ) : null}

        <AppButton title="Voltar" variant="ghost" onPress={() => goTo('profile')} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  title: { color: Palette.text, fontSize: 20, fontFamily: Fonts.serif, fontWeight: '900' },
  subtitle: { color: Palette.textMuted, fontSize: 13, lineHeight: 18 },
  status: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
  },
  statusOn: { backgroundColor: 'rgba(34,197,94,0.16)' },
  statusOff: { backgroundColor: 'rgba(148,163,184,0.18)' },
  statusText: { color: Palette.text, fontWeight: '800', fontSize: 12 },
  message: { color: Palette.primary, fontSize: 13 },
  row: { gap: Spacing.two },
  form: { gap: Spacing.two },
  input: {
    backgroundColor: Palette.bgAlt,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    padding: Spacing.two,
    color: Palette.text,
    fontSize: 14,
  },
});
