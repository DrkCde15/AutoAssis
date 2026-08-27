import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { ModPassportScreen } from '@/screens/ModPassportScreen';
import { MoreScreen } from '@/screens/MoreScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PlansScreen } from '@/screens/PlansScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RaioXScreen } from '@/screens/RaioXScreen';
import { SecurityScreen } from '@/screens/SecurityScreen';
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
  | 'raiox'
  | 'modpassport'
  | 'videos'
  | 'events'
  | 'plans'
  | 'notifications'
  | 'settings'
  | 'feedback'
  | 'dashboard'
  | 'mechanics'
  | 'security'
  | 'more';

const MAIN_TABS: { key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Início', icon: 'home' },
  { key: 'chat', label: 'NOG', icon: 'chatbubble-ellipses' },
  { key: 'vehicles', label: 'Meu Carro', icon: 'car-sport' },
  { key: 'maintenance', label: 'Manut.', icon: 'construct' },
  { key: 'profile', label: 'Perfil', icon: 'person' },
];

const TITLES: Record<AppTab, string> = {
  home: 'AutoAssist',
  chat: 'NOG',
  vehicles: 'Meu Carro',
  maintenance: 'Manutenções',
  profile: 'Perfil',
  raiox: 'Raio-X Mecânico',
  modpassport: 'Mod Passport',
  videos: 'Biblioteca NOG',
  events: 'Eventos',
  plans: 'Planos & Indicação',
  notifications: 'Notificações',
  settings: 'Configurações',
  feedback: 'Feedback',
  dashboard: 'Painel',
  mechanics: 'Mecânicos',
  security: 'Segurança',
  more: 'Mais recursos',
};

export type Nav = {
  goTo: (tab: AppTab) => void;
  goBack: () => void;
};

export function AppShell() {
  const { user, request } = useAuth();
  const [stack, setStack] = useState<AppTab[]>(['home']);
  const current = stack[stack.length - 1] ?? 'home';
  const canGoBack = stack.length > 1;

  const goTo = useCallback((tab: AppTab) => {
    setStack((prev) => {
      if (MAIN_TABS.some((t) => t.key === tab)) return [tab];
      return [...prev, tab];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const nav: Nav = useMemo(() => ({ goTo, goBack }), [goTo, goBack]);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !request) return;
    let active = true;
    void (async () => {
      try {
        const data = await request<{ count: number }>('/api/notifications/unread-count');
        if (active) setUnreadCount(data.count || 0);
      } catch {
        if (active) setUnreadCount(0);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, request, current]);

  const screen = useMemo(() => {
    switch (current) {
      case 'chat':
        return <ChatScreen nav={nav} />;
      case 'vehicles':
        return <VehiclesScreen nav={nav} />;
      case 'maintenance':
        return <MaintenanceScreen nav={nav} />;
      case 'profile':
        return <ProfileScreen nav={nav} />;
      case 'raiox':
        return <RaioXScreen nav={nav} />;
      case 'modpassport':
        return <ModPassportScreen nav={nav} />;
      case 'videos':
        return <VideosScreen goTo={nav.goTo} />;
      case 'events':
        return <EventsScreen goTo={nav.goTo} />;
      case 'plans':
        return <PlansScreen goTo={nav.goTo} />;
      case 'notifications':
        return <NotificationsScreen goTo={nav.goTo} />;
      case 'settings':
        return <SettingsScreen goTo={nav.goTo} />;
      case 'feedback':
        return <FeedbackScreen goTo={nav.goTo} />;
      case 'dashboard':
        return <DashboardScreen goTo={nav.goTo} />;
      case 'mechanics':
        return <MechanicsScreen goTo={nav.goTo} />;
      case 'security':
        return <SecurityScreen goTo={nav.goTo} />;
      case 'more':
        return <MoreScreen goTo={nav.goTo} />;
      default:
        return <HomeScreen nav={nav} />;
    }
  }, [current, nav]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          {canGoBack ? (
            <Pressable onPress={goBack} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={Palette.text} />
            </Pressable>
          ) : null}
          <Image source={require('../logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>{TITLES[current]}</Text>
            <Text style={styles.userLine}>
              {user?.nome ? `Olá, ${user.nome.split(' ')[0]}` : 'Seu copiloto de carro'}
            </Text>
          </View>
        </View>
        <View style={styles.bellWrap}>
          <Pressable onPress={() => nav.goTo('notifications')} hitSlop={8} style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={22} color={Palette.text} />
          </Pressable>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.screen}>{screen}</View>

      <View style={styles.tabBar}>
        {MAIN_TABS.map((item) => {
          const isActive = item.key === current;
          return (
            <Pressable
              key={item.key}
              onPress={() => goTo(item.key)}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}>
              <Ionicons name={item.icon} size={22} color={isActive ? Palette.primary : Palette.textMuted} />
              <Text style={[styles.tabLabel, isActive ? styles.tabTextActive : null]}>{item.label}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgAlt,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgAlt,
  },
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.red,
    borderWidth: 2,
    borderColor: Palette.surface,
  },
  badgeText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '800',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  brandText: {
    gap: 1,
  },
  brandName: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.serif,
    letterSpacing: 0.2,
  },
  userLine: {
    color: Palette.textMuted,
    fontSize: 12,
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
    borderRadius: 10,
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
