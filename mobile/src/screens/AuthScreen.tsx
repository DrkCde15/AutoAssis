import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Field, SectionTitle } from '@/components/primitives';
import { Fonts, Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        if (!nome.trim()) {
          setError('Informe seu nome.');
          setLoading(false);
          return;
        }
        await register(nome.trim(), email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoMark}>A</Text>
          </View>
          <Text style={styles.appName}>AutoAssist</Text>
          <Text style={styles.appTag}>Copiloto IA do seu veículo</Text>
        </View>

        <SectionTitle title={mode === 'login' ? 'Entrar' : 'Criar conta'} />

        {mode === 'register' ? (
          <Field label="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" autoCapitalize="words" />
        ) : null}
        <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          title={mode === 'login' ? 'Entrar' : 'Criar conta'}
          onPress={submit}
          loading={loading}
        />

        <View style={styles.switch}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
          </Text>
          <AppButton
            title={mode === 'login' ? 'Criar conta' : 'Entrar'}
            variant="ghost"
            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.four,
  },
  brand: { alignItems: 'center', gap: Spacing.two },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: Palette.primaryMuted,
    borderWidth: 2,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: { color: Palette.primary, fontSize: 32, fontWeight: '800', fontFamily: Fonts.serif },
  appName: { color: Palette.text, fontSize: 26, fontFamily: Fonts.serif, fontWeight: '800' },
  appTag: { color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.sans },
  error: { color: Palette.red, fontSize: 13, lineHeight: 18 },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  switchText: { color: Palette.textMuted, fontSize: 14 },
});
