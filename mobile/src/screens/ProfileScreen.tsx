import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, Pill } from '@/components/primitives';
import { Fonts, Palette, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth';
import type { Nav } from '@/screens/AppShell';

type ProfileItem = { icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean };

export function ProfileScreen({ nav }: { nav: Nav }) {
  const { user, logout, refreshUser, request } = useAuth();
  const isPremium = !!user?.is_premium;

  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState('');

  async function openCheckout() {
    setPaymentMsg('');
    try {
      const data = await request<{ checkout_url?: string; data?: { checkout_url?: string } }>('/api/pay/preference', {
        method: 'POST',
        body: {},
      });
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      if (checkoutUrl) await Linking.openURL(checkoutUrl);
      else setPaymentMsg('Nao foi possivel abrir o checkout no momento.');
    } catch (error) {
      setPaymentMsg(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao abrir o checkout.');
    }
  }

  async function verifyPayment() {
    setCheckingPayment(true);
    setPaymentMsg('Verificando pagamento...');
    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        const result = await request<{ success: boolean; is_premium: boolean; message?: string }>('/api/pay/confirm', {
          method: 'POST',
          body: {},
        });
        if (result.is_premium) {
          await refreshUser();
          setPaymentMsg('Pagamento confirmado! Plano Premium ativo.');
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setPaymentMsg('Pagamento ainda nao confirmado. Aguarde o processamento e tente novamente.');
    } catch (error) {
      setPaymentMsg(
        error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao verificar o pagamento.',
      );
    } finally {
      setCheckingPayment(false);
    }
  }

  const items: ProfileItem[] = [
    { icon: 'person', label: 'Minha conta', sub: 'Dados pessoais', onPress: () => nav.goTo('settings') },
    { icon: 'shield-checkmark', label: 'Segurança', sub: '2FA e senha', onPress: () => nav.goTo('security') },
    { icon: 'ribbon', label: 'Indique amigos', sub: 'Ganhe 1 mês Premium', onPress: () => nav.goTo('plans') },
    { icon: 'library', label: 'Biblioteca NOG', sub: 'Vídeos e links', onPress: () => nav.goTo('videos') },
    { icon: 'calendar', label: 'Eventos', sub: 'Agenda automotiva', onPress: () => nav.goTo('events') },
    { icon: 'construct', label: 'Mecânicos', sub: 'Oficinas próximas', onPress: () => nav.goTo('mechanics') },
    { icon: 'settings', label: 'Configurações', sub: 'Preferências do app', onPress: () => nav.goTo('settings') },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.nome || 'A').slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.nome || 'Usuário AutoAssist'}</Text>
        <Text style={styles.email}>{user?.email || 'Sessão mobile'}</Text>
        <Pill tone={isPremium ? 'good' : 'neutral'} label={isPremium ? 'Premium ativo' : 'Plano gratuito'} />
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <Info label="Consultas" value={String(user?.total_consultas ?? 0)} />
        <Info label="Veículos" value={String(user?.veiculos?.length ?? 0)} />
        <Info label="Teste restante" value={`${user?.trial_days_remaining ?? 0} dias`} />
      </View>

      <Card style={styles.list}>
        {items.map((item, i) => (
          <View key={item.label}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Pressable onPress={item.onPress} style={styles.item}>
              <View style={styles.itemIcon}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={Palette.primary} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.sub ? <Text style={styles.itemSub}>{item.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Palette.textSoft} />
            </Pressable>
          </View>
        ))}
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium</Text>
        {!isPremium ? (
          <>
            <AppButton title="Assinar Premium" onPress={openCheckout} />
            <AppButton title="Ja paguei — verificar" variant="secondary" onPress={verifyPayment} loading={checkingPayment} />
          </>
        ) : (
          <AppButton title="Gerenciar assinatura" variant="secondary" onPress={() => nav.goTo('plans')} />
        )}
        {paymentMsg ? <Text style={styles.paymentMsg}>{paymentMsg}</Text> : null}
      </View>

      <View style={styles.actions}>
        <AppButton title="Atualizar dados" variant="ghost" onPress={refreshUser} />
        <AppButton title="Sair" variant="danger" onPress={logout} />
      </View>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  profile: { alignItems: 'center', gap: Spacing.two },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Palette.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Palette.white, fontSize: 32, fontFamily: Fonts.serif, fontWeight: '900' },
  name: { color: Palette.text, fontSize: 22, fontFamily: Fonts.serif, fontWeight: '900', textAlign: 'center' },
  email: { color: Palette.textMuted },
  section: { gap: Spacing.two },
  sectionTitle: { color: Palette.text, fontSize: 18, fontFamily: Fonts.serif, fontWeight: '900' },
  infoRow: { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Spacing.two, gap: Spacing.one },
  infoLabel: { color: Palette.textMuted, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  infoValue: { color: Palette.text, lineHeight: 20 },
  list: { gap: Spacing.one, paddingVertical: Spacing.one },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(124,92,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { color: Palette.text, fontWeight: '800', fontFamily: Fonts.sans },
  itemSub: { color: Palette.textMuted, fontSize: 12 },
  sep: { height: 1, backgroundColor: Palette.border },
  actions: { gap: Spacing.two },
  paymentMsg: { color: Palette.primary, fontSize: 13, fontFamily: Fonts.sans },
});
