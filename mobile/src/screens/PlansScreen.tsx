import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { AppButton, Card, Pill } from '@/components/primitives';
import { Palette, Spacing, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type PlansScreenProps = {
  goTo: (tab: AppTab) => void;
};

export function PlansScreen({ goTo }: PlansScreenProps) {
  const { request, user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await request<{ referral_code: string; referral_link: string }>('/api/referral');
        setReferralCode(data.referral_code || '');
        setReferralLink(data.referral_link || '');
      } catch {
        // ignora falha ao carregar indicacao
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [request]);

  async function openCheckout() {
    setMessage('');
    try {
      const data = await request<{ checkout_url?: string; data?: { checkout_url?: string } }>('/api/pay/preference', {
        method: 'POST',
        body: {},
      });
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
      } else {
        setMessage('Checkout premium não configurado.');
      }
    } catch (openError) {
      setMessage(openError instanceof Error ? openError.message : 'Não foi possível abrir o checkout.');
    }
  }

  function copyLink() {
    if (!referralLink) return;
    Clipboard.setString(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card style={styles.plan}>
        <Pill
          tone={user?.is_premium ? 'good' : 'info'}
          label={user?.is_premium ? 'Premium ativo' : 'Plano gratuito'}
        />
        <Text style={styles.title}>AutoAssist Premium</Text>
        <Text style={styles.price}>R$ 19,90/mês</Text>
        <Text style={styles.muted}>
          Consultas ilimitadas com o NOG, histórico de manutenção, alertas proativos, biblioteca de vídeos e eventos.
        </Text>
        {!user?.is_premium ? <AppButton title="Ativar Premium" onPress={openCheckout} /> : null}
      </Card>

      <Card style={styles.referral}>
        <Text style={styles.sectionTitle}>Indique e ganhe</Text>
        <Text style={styles.muted}>
          Compartilhe seu link. Quem se cadastra usando ele concede 1 mês de Premium à sua conta.
        </Text>
        {referralCode ? <Text style={styles.code}>{referralCode}</Text> : null}
        {referralLink ? (
          <View style={styles.refActions}>
            <AppButton title={copied ? 'Link copiado!' : 'Copiar link'} variant="secondary" onPress={copyLink} />
            <AppButton title="Abrir link" variant="ghost" onPress={() => Linking.openURL(referralLink)} />
          </View>
        ) : null}
      </Card>

      {message ? <Text style={styles.error}>{message}</Text> : null}
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
  plan: {
    gap: Spacing.two,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  price: {
    color: Palette.primary,
    fontSize: 20,
    fontFamily: Fonts.sans,
    fontWeight: '900',
  },
  muted: {
    color: Palette.textMuted,
    lineHeight: 20,
  },
  referral: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: Palette.text,
    fontSize: 18,
    fontFamily: Fonts.serif,
    fontWeight: '900',
  },
  code: {
    color: Palette.text,
    fontWeight: '900',
    fontSize: 16,
    fontFamily: Fonts.sans,
    letterSpacing: 1,
  },
  refActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  error: {
    color: Palette.red,
    lineHeight: 20,
  },
});
