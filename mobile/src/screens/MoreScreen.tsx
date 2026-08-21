import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from '@/screens/AppShell';

type MoreScreenProps = {
  goTo: (tab: AppTab) => void;
};

const ITEMS: { key: AppTab; label: string; desc: string }[] = [
  { key: 'videos', label: 'Biblioteca NOG', desc: 'Vídeos e links recomendados pelo assistente' },
  { key: 'events', label: 'Eventos', desc: 'Feiras, encontros e competições automotivas' },
  { key: 'plans', label: 'Planos & Indicação', desc: 'Assine o Premium e indique amigos' },
  { key: 'mechanics', label: 'Mecânicos', desc: 'Oficinas próximas à sua localização' },
  { key: 'map', label: 'Mapa', desc: 'Mecânicos e eventos no mapa' },
  { key: 'dashboard', label: 'Painel', desc: 'Saúde e histórico dos seus veículos' },
  { key: 'notifications', label: 'Notificações', desc: 'Alertas e avisos do AutoAssist' },
  { key: 'feedback', label: 'Feedback', desc: 'Avalie e ajude a melhorar o app' },
  { key: 'settings', label: 'Configurações', desc: 'Perfil, plano e sair da conta' },
];

export function MoreScreen({ goTo }: MoreScreenProps) {
  const { user } = useAuth();
  void user;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Mais recursos</Text>
      {ITEMS.map((item) => (
        <Pressable key={item.key} onPress={() => goTo(item.key)} style={styles.card}>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  heading: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '900',
    paddingBottom: Spacing.one,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    padding: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: Spacing.one,
  },
  cardTitle: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardDesc: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: Palette.textMuted,
    fontSize: 24,
    fontWeight: '900',
  },
});
