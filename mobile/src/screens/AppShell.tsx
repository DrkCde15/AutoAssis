import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Glass, Palette, Radius, Spacing } from '@/constants/theme';
import { AmbientGlow } from '@/components/primitives';
import { Drawer, DRAWER_ITEMS } from '@/components/Drawer';
import { ChatScreen } from '@/screens/ChatScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { EventsScreen } from '@/screens/EventsScreen';
import { FeedbackScreen } from '@/screens/FeedbackScreen';
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
import { VideosScreen } from '@/screens/VideosScreen';
import { useAuth } from '@/context/auth';

export type AppTab =
  | 'chat'
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

const TITLES: Record<AppTab, string> = {
  chat: 'NOG',
  maintenance: 'Manutenções',
  profile: 'Perfil',
  raiox: 'Raio-X',
  modpassport: 'Mod Passport',
  videos: 'Biblioteca',
  events: 'Eventos',
  plans: 'Planos',
  notifications: 'Notificações',
  settings: 'Configurações',
  feedback: 'Feedback',
  dashboard: 'Painel',
  mechanics: 'Mecânicos',
  security: 'Segurança',
  more: 'Mais',
};

export type Nav = {
  goTo: (tab: AppTab) => void;
  goBack: () => void;
  openDrawer: () => void;
};

const WIDE_BREAKPOINT = 768;

export function AppShell() {
  const { user, request } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [stack, setStack] = useState<AppTab[]>(['chat']);
  const current = stack[stack.length - 1] ?? 'chat';
  const canGoBack = stack.length > 1;

  const [drawerOpen, setDrawerOpen] = useState(false);

  const goTo = useCallback((tab: AppTab) => {
    setStack([tab]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const nav: Nav = useMemo(() => ({ goTo, goBack, openDrawer: () => setDrawerOpen(true) }), [goTo, goBack]);

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
        return <ChatScreen nav={nav} />;
    }
  }, [current, nav]);

  const showHeader = current !== 'chat';

  return (
    <SafeAreaView style={styles.root}>
      <AmbientGlow />
      {showHeader ? (
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {isWide ? null : canGoBack ? (
              <Pressable onPress={goBack} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={22} color={Palette.text} />
              </Pressable>
            ) : (
              <Pressable onPress={() => setDrawerOpen(true)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="menu" size={20} color={Palette.text} />
              </Pressable>
            )}
            <Image source={require('../logo.png')} style={styles.logo} resizeMode="contain" />
            <View style={styles.brandText}>
              <Text style={styles.screenTitle}>{TITLES[current]}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => nav.goTo('notifications')} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={Palette.textMuted} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[styles.body, isWide ? styles.bodyRow : null]}>
        {isWide ? (
          <Drawer
            variant="persistent"
            items={DRAWER_ITEMS}
            active={current}
            onNavigate={goTo}
            open={false}
            onClose={() => {}}
            userName={user?.nome}
          />
        ) : null}
        <View style={styles.screen}>{screen}</View>
      </View>

      {!isWide ? (
        <Drawer
          variant="overlay"
          items={DRAWER_ITEMS}
          active={current}
          onNavigate={goTo}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userName={user?.nome}
        />
      ) : null}
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
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
    backgroundColor: Glass.header,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
  },
  brandText: {
    flex: 1,
  },
  screenTitle: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.red,
  },
  badgeText: {
    color: Palette.white,
    fontSize: 9,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  screen: {
    flex: 1,
  },
});
