import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import type { AppTab } from '@/screens/AppShell';

const DRAWER_WIDTH = 280;

export type DrawerItem = {
  key: AppTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const DRAWER_ITEMS: DrawerItem[] = [
  { key: 'chat', label: 'NOG (IA)', icon: 'chatbubble-ellipses' },
  { key: 'dashboard', label: 'Painel', icon: 'speedometer' },
  { key: 'maintenance', label: 'Manutenções', icon: 'construct' },
  { key: 'mechanics', label: 'Mecânicos', icon: 'build' },
  { key: 'videos', label: 'Vídeos', icon: 'play-circle' },
  { key: 'events', label: 'Eventos', icon: 'calendar' },
  { key: 'plans', label: 'Planos', icon: 'card' },
  { key: 'notifications', label: 'Notificações', icon: 'notifications' },
  { key: 'profile', label: 'Perfil', icon: 'person' },
  { key: 'security', label: 'Segurança', icon: 'shield-checkmark' },
  { key: 'settings', label: 'Configurações', icon: 'settings' },
  { key: 'feedback', label: 'Feedback', icon: 'chatbox' },
  { key: 'more', label: 'Mais', icon: 'ellipsis-horizontal' },
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

export function Drawer({ items, active, onNavigate, open, onClose, userName, variant }: Props) {
  const translate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (variant !== 'overlay') return;
    Animated.timing(translate, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, variant, translate]);

  const content = (
    <View style={styles.inner}>
      <View style={styles.brand}>
        <Image source={require('../logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.brandText}>
          <Text style={styles.brandName}>AutoAssist</Text>
          <Text style={styles.userLine}>
            {userName ? `Olá, ${userName.split(' ')[0]}` : 'Seu copiloto de carro'}
          </Text>
        </View>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <Pressable
              key={it.key}
              onPress={() => {
                onNavigate(it.key);
                if (variant === 'overlay') onClose();
              }}
              style={[styles.item, isActive ? styles.itemActive : null]}>
              <Ionicons name={it.icon} size={22} color={isActive ? Palette.primary : Palette.textMuted} />
              <Text style={[styles.itemLabel, isActive ? styles.itemLabelActive : null]}>{it.label}</Text>
            </Pressable>
          );
        })}
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
      <Animated.View style={[styles.overlayPanel, { transform: [{ translateX: translate }] }]}>{content}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Palette.surface,
  },
  persistent: {
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    borderRightColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  inner: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Palette.surface,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  brandText: { gap: 1 },
  brandName: { color: Palette.text, fontSize: 16, fontWeight: '900', fontFamily: Fonts.serif },
  userLine: { color: Palette.textMuted, fontSize: 12 },
  list: { flex: 1 },
  listPad: { padding: Spacing.two, gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
  itemActive: { backgroundColor: 'rgba(124,92,255,0.14)' },
  itemLabel: { color: Palette.textMuted, fontSize: 15, fontWeight: '800', fontFamily: Fonts.sans },
  itemLabelActive: { color: Palette.primary },
});
