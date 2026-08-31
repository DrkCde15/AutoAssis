import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Card, Pill, SectionTitle } from '@/components/primitives';
import { Palette, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

export function SettingsScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { request, logout } = useAuth();
  const [biometric, setBiometric] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await request<{ biometric?: boolean; dark_mode?: boolean }>('/api/user/settings');
      setBiometric(!!data.biometric);
      setDarkMode(data.dark_mode !== false);
    } catch {
      // defaults
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function toggleBiometric(value: boolean) {
    setBiometric(value);
    try {
      await request('/api/user/settings', { method: 'PUT', body: { biometric: value } });
    } catch {
      setBiometric(!value);
    }
  }

  async function toggleDark(value: boolean) {
    setDarkMode(value);
    try {
      await request('/api/user/settings', { method: 'PUT', body: { dark_mode: value } });
    } catch {
      setDarkMode(!value);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionTitle kicker="Preferências" title="Configurações" />

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Ionicons name="finger-print" size={20} color={Palette.primary} />
            <Text style={styles.rowLabel}>Biometria</Text>
          </View>
          <Switch
            value={biometric}
            onValueChange={toggleBiometric}
            disabled={loading}
            thumbColor={Palette.white}
            trackColor={{ false: Palette.bgAlt, true: Palette.primary }}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Ionicons name="moon" size={20} color={Palette.accent} />
            <Text style={styles.rowLabel}>Modo escuro</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={toggleDark}
            disabled={loading}
            thumbColor={Palette.white}
            trackColor={{ false: Palette.bgAlt, true: Palette.primary }}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Sobre</Text>
        <Pressable style={styles.row} onPress={() => Linking.openURL('https://autoassist.com.br/termos')}>
          <Text style={styles.rowLabel}>Termos de uso</Text>
          <Ionicons name="chevron-forward" size={16} color={Palette.textSoft} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => Linking.openURL('https://autoassist.com.br/privacidade')}>
          <Text style={styles.rowLabel}>Política de privacidade</Text>
          <Ionicons name="chevron-forward" size={16} color={Palette.textSoft} />
        </Pressable>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Versão</Text>
          <Pill tone="neutral" size="sm" label="1.0.0" />
        </View>
      </Card>

      <AppButton title="Excluir conta" variant="ghost" onPress={() => {}} />
      <AppButton title="Sair da conta" variant="ghost" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  card: { gap: Spacing.three, ...Shadow.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowLabel: { color: Palette.text, fontSize: 15, fontWeight: '600' },
  sectionLabel: { color: Palette.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
