import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import type { AppTab } from '@/screens/AppShell';

const DRAWER_WIDTH = 280;

export type DrawerItem = {
  key: AppTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  group?: 'main' | 'tools' | 'account';
};

export const DRAWER_ITEMS: DrawerItem[] = [
  { key: 'chat', label: 'NOG IA', icon: 'chatbubble-ellipses', group: 'main' },
  { key: 'dashboard', label: 'Painel', icon: 'speedometer', group: 'main' },
  { key: 'maintenance', label: 'Manutenções', icon: 'construct', group: 'tools' },
  { key: 'mechanics', label: 'Mecânicos', icon: 'build', group: 'tools' },
  { key: 'videos', label: 'Vídeos', icon: 'play-circle', group: 'tools' },
  { key: 'events', label: 'Eventos', icon: 'calendar', group: 'tools' },
  { key: 'plans', label: 'Planos', icon: 'card', group: 'account' },
  { key: 'notifications', label: 'Notificações', icon: 'notifications', group: 'account' },
  { key: 'profile', label: 'Perfil', icon: 'person', group: 'account' },
  { key: 'security', label: 'Segurança', icon: 'shield-checkmark', group: 'account' },
  { key: 'settings', label: 'Configurações', icon: 'settings', group: 'account' },
  { key: 'feedback', label: 'Feedback', icon: 'chatbox', group: 'account' },
  { key: 'more', label: 'Mais', icon: 'ellipsis-horizontal', group: 'account' },
];

type Props = {
  items: DrawerItem[];
  active: AppTab;
  onNavigate: (tab: AppTab) => void;
  open: boolean;
  onClose: () => void;
  userName?: string;
  variant: 'overlay' | 'persistent';
};

const GROUP_LABELS: Record<string, string> = {
  main: 'Principal',
  tools: 'Ferramentas',
  account: 'Conta',
};

export function Drawer({ items, active, onNavigate, open, onClose, userName, variant }: Props) {
  const translate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (variant !== 'overlay') return;
    Animated.timing(translate, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [open, variant, translate]);

  const groups = items.reduce<Record<string, DrawerItem[]>>((acc, item) => {
    const g = item.group || 'main';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const content = (
    <View style={styles.inner}>
      <View style={styles.brand}>
        <Image source={require('../logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.brandText}>
          <Text style={styles.brandName}>AutoAssist</Text>
          <Text style={styles.userLine}>
            {userName ? `${userName.split(' ')[0]}` : 'Seu copiloto'}
          </Text>
        </View>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
        {Object.entries(groups).map(([groupKey, groupItems], groupIdx) => (
          <View key={groupKey}>
            {groupIdx > 0 ? <View style={styles.groupSep} /> : null}
            <Text style={styles.groupLabel}>{GROUP_LABELS[groupKey] || groupKey}</Text>
            {groupItems.map((it) => {
              const isActive = it.key === active;
              return (
                <Pressable
                  key={it.key}
                  onPress={() => {
                    onNavigate(it.key);
                    if (variant === 'overlay') onClose();
                  }}
                  style={[styles.item, isActive ? styles.itemActive : null]}>
                  {isActive ? <View style={styles.itemIndicator} /> : null}
                  <Ionicons
                    name={it.icon}
                    size={20}
                    color={isActive ? Palette.primary : Palette.textMuted}
                  />
                  <Text style={[styles.itemLabel, isActive ? styles.itemLabelActive : null]}>
                    {it.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (variant === 'persistent') {
    return <View style={styles.persistent}>{content}</View>;
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, { opacity: open ? 1 : 0 }]}
      pointerEvents={open ? 'auto' : 'none'}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.overlayPanel, { transform: [{ translateX: translate }] }]}>
        {content}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Palette.surface,
    ...Shadow.lg,
  },
  persistent: {
    width: DRAWER_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  inner: {
    flex: 1,
    flexDirection: 'column',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  logo: { width: 40, height: 40, borderRadius: Radius.md },
  brandText: { flex: 1, gap: 2 },
  brandName: { color: Palette.text, fontSize: 16, fontWeight: '800', fontFamily: Fonts.sans },
  userLine: { color: Palette.textMuted, fontSize: 13, fontFamily: Fonts.sans },
  list: { flex: 1 },
  listPad: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.two },
  groupSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.border,
    marginVertical: Spacing.three,
    marginHorizontal: Spacing.three,
  },
  groupLabel: {
    color: Palette.textSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Fonts.sans,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
    paddingTop: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.one,
    position: 'relative',
  },
  itemActive: {
    backgroundColor: Palette.primaryMuted,
  },
  itemIndicator: {
    position: 'absolute',
    left: -4,
    top: '50%',
    marginTop: -12,
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: Palette.primary,
  },
  itemLabel: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  itemLabelActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
});
