import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, EmptyState, Field, Pill, SectionTitle, Stat } from '@/components/primitives';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type Plan = { id: string; name: string; price: string; period: string; features: string[] };
type B2BUsage = { plan: string; requests_today: number; requests_limit: number; message?: string };

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Grátis',
    price: 'R$ 0',
    period: '/mês',
    features: ['Diagnóstico visual', '5 mensagens/dia', 'Informações básicas'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 19,90',
    period: '/mês',
    features: ['Tudo do Grátis', 'Manutenções com alertas', 'Raio-X ilimitado', 'Suporte prioritário'],
  },
  {
    id: 'b2b',
    name: 'B2B',
    price: 'Sob consulta',
    period: '',
    features: ['API dedicada', 'Rate limits altos', 'Suporte técnico', 'SLA garantido'],
  },
];

export function PlansScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { user, request, refreshUser } = useAuth();
  const [b2bUsage, setB2bUsage] = useState<B2BUsage | null>(null);
  const [b2bKey, setB2bKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const usage = await request<B2BUsage>('/api/b2b/usage').catch(() => null);
      setB2bUsage(usage);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function activatePremium() {
    setMessage('');
    setActivating(true);
    try {
      const data = await request<{ checkout_url?: string; data?: { checkout_url?: string } }>('/api/pay/preference', {
        method: 'POST',
        body: {},
      });
      const url = data.checkout_url || data.data?.checkout_url;
      if (url) {
        await Linking.openURL(url);
        await refreshUser();
      } else {
        setMessage('Checkout não disponível.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao ativar.');
    } finally {
      setActivating(false);
    }
  }

  async function generateKey() {
    setGeneratingKey(true);
    setMessage('');
    try {
      const data = await request<{ key?: string; api_key?: string; message?: string }>('/api/b2b/self-serve/keys', { method: 'POST' });
      const key = data.key || data.api_key;
      if (key) {
        setB2bKey(key);
        Alert.alert('Chave gerada', 'Chave copiada para a área de transferência.');
      }
      if (data.message) setMessage(data.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao gerar chave.');
    } finally {
      setGeneratingKey(false);
    }
  }

  const currentPlan = user?.is_premium ? 'premium' : 'free';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionTitle
        kicker="Assinatura"
        title="Planos"
        subtitle="Escolha o plano ideal para seu uso."
      />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {PLANS.map((plan) => {
        const active = plan.id === currentPlan;
        return (
          <Card key={plan.id} style={[styles.planCard, active ? styles.planCardActive : null]}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  {plan.price}
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </Text>
              </View>
              {active ? <Pill tone="good" label="Atual" /> : null}
            </View>
            <View style={styles.features}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={active ? Palette.primary : Palette.textMuted} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            {plan.id === 'premium' && !user?.is_premium ? (
              <AppButton title="Ativar Premium" onPress={activatePremium} loading={activating} />
            ) : null}
            {plan.id === 'b2b' ? (
              <AppButton title="Gerar chave API" variant="secondary" onPress={generateKey} loading={generatingKey} />
            ) : null}
          </Card>
        );
      })}

      {b2bUsage ? (
        <Card style={styles.usageCard}>
          <SectionTitle title="Uso da API B2B" />
          <View style={styles.usageStats}>
            <Stat label="Plano" value={b2bUsage.plan || '-'} align="center" />
            <Stat label="Requisições hoje" value={`${b2bUsage.requests_today} / ${b2bUsage.requests_limit}`} align="center" />
          </View>
          {b2bUsage.message ? <Text style={styles.muted}>{b2bUsage.message}</Text> : null}
          {b2bKey ? (
            <View style={styles.keyRow}>
              <Text style={styles.keyText} numberOfLines={1}>{b2bKey}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {!loading && !user?.is_premium && !b2bUsage ? (
        <EmptyState
          title="Usando o plano grátis"
          body="Ative o Premium para recursos avançados."
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  error: { color: Palette.red, lineHeight: 20, fontSize: 13 },
  muted: { color: Palette.textMuted, fontSize: 12 },
  planCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  planCardActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primaryMuted,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { color: Palette.text, fontSize: 18, fontWeight: '800', fontFamily: Fonts.sans },
  planPrice: { color: Palette.text, fontSize: 24, fontWeight: '800', fontFamily: Fonts.serif },
  planPeriod: { color: Palette.textMuted, fontSize: 14, fontWeight: '600' },
  features: { gap: Spacing.two },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  featureText: { color: Palette.text, fontSize: 14 },
  usageCard: { gap: Spacing.three },
  usageStats: { flexDirection: 'row', gap: Spacing.two },
  keyRow: {
    backgroundColor: Palette.bgAlt,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  keyText: { color: Palette.text, fontSize: 13, fontFamily: 'monospace' },
});
