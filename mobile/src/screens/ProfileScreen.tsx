import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, Field, Pill, SectionTitle } from '@/components/primitives';
import { Palette, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { Nav } from '@/screens/AppShell';

export function ProfileScreen({ nav }: { nav: Nav }) {
  const { user, request, logout } = useAuth();
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await request('/api/user/profile', { method: 'PUT', body: { nome: nome.trim(), email: email.trim() } });
      setMessage('Perfil atualizado com sucesso.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionTitle kicker="Conta" title="Meu Perfil" />

      <Card style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={Palette.primary} />
        </View>
        <View>
          <Text style={styles.name}>{user?.nome || 'Usuário'}</Text>
          <Text style={styles.email}>{user?.email || 'email@exemplo.com'}</Text>
        </View>
        {user?.is_premium ? <Pill tone="good" label="Premium" /> : <Pill tone="neutral" label="Grátis" />}
      </Card>

      <Card style={styles.form}>
        <Field label="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" />
        <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="email@exemplo.com" keyboardType="email-address" />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <AppButton title="Salvar" onPress={save} loading={saving} />
      </Card>

      <Card style={styles.menuCard}>
        <MenuItem icon="shield-checkmark" label="Segurança" onPress={() => nav.goTo('security')} />
        <View style={styles.divider} />
        <MenuItem icon="notifications" label="Notificações" onPress={() => nav.goTo('notifications')} />
        <View style={styles.divider} />
        <MenuItem icon="settings" label="Configurações" onPress={() => nav.goTo('settings')} />
      </Card>

      <AppButton title="Sair da conta" variant="ghost" onPress={logout} />
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={Palette.textMuted} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Palette.textSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: Palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: Palette.text, fontSize: 17, fontWeight: '700' },
  email: { color: Palette.textMuted, fontSize: 13 },
  form: { gap: Spacing.three },
  message: { color: Palette.primary, fontSize: 13, fontWeight: '600' },
  menuCard: { gap: 0, ...Shadow.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  menuLabel: { flex: 1, color: Palette.text, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Palette.border },
});
