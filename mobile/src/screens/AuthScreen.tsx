import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { AppButton, Card, Field } from '@/components/primitives';
import { Palette, Spacing, Fonts } from '@/constants/theme';
import { ApiError, apiRequest } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/auth';

const MOBILE_OAUTH_SCHEME = 'autoassist://oauth';

export function AuthScreen() {
  const { login, register, verifyTwoFactor, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const title =
    mode === 'login'
      ? 'Entrar no AutoAssist'
      : mode === 'register'
        ? 'Criar conta'
        : mode === 'forgot'
          ? 'Redefinir senha'
          : 'Nova senha';

  async function submit() {
    setMessage('');
    setLoading(true);
    try {
      if (pendingToken) {
        await verifyTwoFactor(pendingToken, code.trim());
        return;
      }

      if (mode === 'login') {
        const result = await login({ email: email.trim(), password });
        if (result.two_factor_required && result.pending_token) {
          setPendingToken(result.pending_token);
          setMessage('Digite o codigo 2FA para concluir o login.');
        }
      } else {
        await register({ nome: nome.trim(), email: email.trim(), password });
      }
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setMessage('');
    setPendingToken(null);
  }

  async function requestReset() {
    setMessage('');
    setLoading(true);
    try {
      await apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setMessage('Se o e-mail existir, enviamos um link de redefinição. Use o token recebido abaixo.');
      setMode('reset');
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset() {
    setMessage('');
    setLoading(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token: token.trim(), password },
      });
      setMessage('Senha redefinida com sucesso. Faça login.');
      setMode('login');
      setToken('');
      setPassword('');
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setMessage('');
    setLoading(true);
    try {
      const authUrl = `${API_BASE_URL}/api/auth/google/login?mobile=1`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, MOBILE_OAUTH_SCHEME);
      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split('?')[1] ?? '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await loginWithGoogle(accessToken, refreshToken);
        } else {
          setMessage('Falha ao obter tokens do Google.');
        }
      } else if (result.type === 'cancel') {
        setMessage('Login com Google cancelado.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha no login com Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text style={styles.markText}>A</Text>
          </View>
          <View>
            <Text style={styles.brandName}>AutoAssist</Text>
            <Text style={styles.brandSub}>IA automotiva no bolso</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.title}>{pendingToken ? 'Verificacao 2FA' : title}</Text>
          <Text style={styles.subtitle}>
            {pendingToken
              ? 'Use o codigo do seu autenticador para liberar a sessao.'
              : 'Acesse o consultor, seus veiculos e o historico de manutencao em uma experiencia nativa.'}
          </Text>

          <View style={styles.form}>
            {pendingToken ? (
              <Field
                label="Codigo 2FA"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
              />
            ) : mode === 'forgot' ? (
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="voce@gmail.com"
              />
            ) : mode === 'reset' ? (
              <>
                <Field
                  label="Token"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  placeholder="Cole o token recebido por e-mail"
                />
                <Field
                  label="Nova senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Minimo 6 caracteres"
                />
              </>
            ) : (
              <>
                {mode === 'register' ? (
                  <Field
                    label="Nome"
                    value={nome}
                    onChangeText={setNome}
                    autoCapitalize="words"
                    placeholder="Seu nome"
                  />
                ) : null}
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="voce@gmail.com"
                />
                <Field
                  label="Senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Minimo 6 caracteres"
                />
                {mode === 'login' ? (
                  <Pressable onPress={() => { setMode('forgot'); setMessage(''); }} style={styles.link}>
                    <Text style={styles.linkText}>Esqueci a senha</Text>
                  </Pressable>
                ) : null}
              </>
            )}

            {message ? <Text style={styles.message}>{message}</Text> : null}

            {pendingToken ? (
              <AppButton title="Validar codigo" onPress={submit} loading={loading} />
            ) : mode === 'forgot' ? (
              <AppButton title="Enviar link" onPress={requestReset} loading={loading} />
            ) : mode === 'reset' ? (
              <AppButton title="Redefinir senha" onPress={confirmReset} loading={loading} />
            ) : (
              <AppButton
                title={mode === 'login' ? 'Entrar' : 'Criar e entrar'}
                onPress={submit}
                loading={loading}
              />
            )}

            {!pendingToken && mode !== 'forgot' && mode !== 'reset' ? (
              <AppButton title="Entrar com Google" variant="secondary" onPress={handleGoogleLogin} loading={loading} />
            ) : null}

            {pendingToken ? (
              <AppButton
                title="Voltar ao login"
                variant="ghost"
                onPress={() => {
                  setPendingToken(null);
                  setCode('');
                  setMessage('');
                }}
              />
            ) : mode === 'forgot' || mode === 'reset' ? (
              <AppButton
                title="Voltar ao login"
                variant="ghost"
                onPress={() => {
                  setMode('login');
                  setMessage('');
                }}
              />
            ) : (
              <AppButton
                title={mode === 'login' ? 'Criar uma conta' : 'Ja tenho conta'}
                variant="ghost"
                onPress={switchMode}
              />
            )}
          </View>
        </Card>

        <Text style={styles.apiText}>API: {API_BASE_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Palette.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Palette.primary,
  },
  markText: {
    color: Palette.white,
    fontSize: 28,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  brandName: {
    color: Palette.text,
    fontSize: 27,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  brandSub: {
    color: Palette.textMuted,
    fontSize: 14,
    fontFamily: Fonts.serif,
    marginTop: 2,
  },
  card: {
    gap: Spacing.two,
  },
  title: {
    color: Palette.text,
    fontSize: 24,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  subtitle: {
    color: Palette.textMuted,
    lineHeight: 21,
  },
  form: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  message: {
    color: Palette.amber,
    lineHeight: 20,
  },
  link: { alignSelf: 'flex-end', paddingVertical: 4 },
  linkText: { color: Palette.primary, fontSize: 13, fontWeight: '600' },
  apiText: {
    color: Palette.textMuted,
    fontSize: 12,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
});
