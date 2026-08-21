import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Glass, Palette, Shadow, Spacing } from '@/constants/theme';
import { ChatScreen } from '@/screens/ChatScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { EventsScreen } from '@/screens/EventsScreen';
import { FeedbackScreen } from '@/screens/FeedbackScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { MaintenanceScreen } from '@/screens/MaintenanceScreen';
import { MechanicsScreen } from '@/screens/MechanicsScreen';
import { MoreScreen } from '@/screens/MoreScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PlansScreen } from '@/screens/PlansScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { VehiclesScreen } from '@/screens/VehiclesScreen';
import { VideosScreen } from '@/screens/VideosScreen';
import { useAuth } from '@/context/auth';

export type AppTab =
  | 'home'
  | 'chat'
  | 'vehicles'
  | 'maintenance'
  | 'profile'
  | 'more'
  | 'videos'
  | 'events'
  | 'plans'
  | 'notifications'
  | 'settings'
  | 'feedback'
  | 'dashboard'
  | 'mechanics';

const tabs: { key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Inicio', icon: 'home-outline' },
  { key: 'chat', label: 'Chat', icon: 'chatbubble-outline' },
  { key: 'vehicles', label: 'Veiculos', icon: 'car-outline' },
  { key: 'maintenance', label: 'Notas', icon: 'construct-outline' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline' },
  { key: 'more', label: 'Mais', icon: 'ellipsis-horizontal' },
];

export function AppShell() {
  const [tab, setTab] = useState<AppTab>('home');
  const { user } = useAuth();

  const screen = useMemo(() => {
    switch (tab) {
      case 'chat':
        return <ChatScreen />;
      case 'vehicles':
        return <VehiclesScreen />;
      case 'maintenance':
        return <MaintenanceScreen goTo={setTab} />;
      case 'profile':
        return <ProfileScreen goTo={setTab} />;
      case 'more':
        return <MoreScreen goTo={setTab} />;
      case 'videos':
        return <VideosScreen goTo={setTab} />;
      case 'events':
        return <EventsScreen goTo={setTab} />;
      case 'plans':
        return <PlansScreen goTo={setTab} />;
      case 'notifications':
        return <NotificationsScreen goTo={setTab} />;
      case 'settings':
        return <SettingsScreen goTo={setTab} />;
      case 'feedback':
        return <FeedbackScreen goTo={setTab} />;
      case 'dashboard':
        return <DashboardScreen goTo={setTab} />;
      case 'mechanics':
        return <MechanicsScreen goTo={setTab} />;
      default:
        return <HomeScreen goTo={setTab} />;
    }
  }, [tab]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <Text style={styles.markText}>A</Text>
          </View>
          <View>
            <Text style={styles.brandName}>AutoAssist</Text>
            <Text style={styles.userLine}>{user?.nome || 'Sessao ativa'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.screen}>{screen}</View>

      <View style={styles.tabBar}>
        {tabs.map((item) => {
          const active =
            item.key === tab ||
            (item.key === 'more' &&
              [
                'videos',
                'events',
                'plans',
                'notifications',
                'settings',
                'feedback',
                'dashboard',
                'mechanics',
              ].includes(tab));
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[styles.tabButton, active ? styles.tabButtonActive : null]}>
              <Ionicons
                name={item.icon}
                size={22}
                color={active ? Palette.primary : Palette.textMuted}
              />
              <Text style={[styles.tabLabel, active ? styles.tabTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: Glass.header,
    ...Shadow.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  markText: {
    color: Palette.white,
    fontWeight: '900',
    fontSize: 20,
    fontFamily: Fonts.serif,
  },
  brandName: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.sans,
    letterSpacing: 0.2,
  },
  userLine: {
    color: Palette.textMuted,
    fontSize: 12,
    marginTop: 1,
    fontFamily: Fonts.sans,
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: Glass.tabBar,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 2,
  },
  tabButtonActive: {
    backgroundColor: Palette.bgAlt,
  },
  tabLabel: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Fonts.sans,
  },
  tabTextActive: {
    color: Palette.primary,
  },
});
