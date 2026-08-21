import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Pill } from '@/components/primitives';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { AppTab } from './AppShell';

export function SettingsScreen({ goTo }: { goTo: (tab: AppTab) => void }) {
  const { user, logout, refreshUser } = useAuth();

  if (!user) {
    return <EmptyState title="Sem sessao" message="Faca login para ver as configuracoes." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Configuracoes</Text>

      <Card>
        <Text style={styles.name}>{user.nome}</Text>
        {user.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        <View style={styles.badges}>
          <Pill tone={user.is_premium ? 'good' : 'neutral'}>
            {user.is_premium ? 'Premium' : 'Gratuito'}
          </Pill>
        </View>
      </Card>

      <AppButton variant="secondary" onPress={() => goTo('plans')}>
        Plano e indicacao
      </AppButton>
      <AppButton variant="secondary" onPress={() => goTo('notifications')}>
        Notificacoes
      </AppButton>
      <AppButton variant="secondary" onPress={() => goTo('feedback')}>
        Enviar feedback
      </AppButton>
      <AppButton variant="secondary" onPress={() => goTo('dashboard')}>
        Painel do veiculo
      </AppButton>

      <AppButton variant="ghost" onPress={() => refreshUser()}>
        Atualizar dados
      </AppButton>
      <AppButton
        variant="danger"
        onPress={() => {
          logout();
          goTo('home');
        }}>
        Sair da conta
      </AppButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Palette.text, fontSize: 22, fontWeight: '700' },
  name: { color: Palette.text, fontSize: 18, fontWeight: '700' },
  meta: { color: Palette.textMuted, fontSize: 14, marginTop: Spacing.one },
  badges: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
});
