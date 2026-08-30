import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type AttachmentMenuProps = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
  onPdf: () => void;
};

type MenuAction = { icon: string; label: string; onPress: () => void };

export function AttachmentMenu({ visible, onClose, onCamera, onGallery, onDocument, onPdf }: AttachmentMenuProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible) return null;

  const quick: MenuAction[] = [
    { icon: 'camera', label: 'Câmera', onPress: onCamera },
    { icon: 'images', label: 'Galeria', onPress: onGallery },
    { icon: 'document', label: 'Documento', onPress: onDocument },
  ];

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.row}>
          {quick.map((action) => (
            <Pressable key={action.label} onPress={action.onPress} style={styles.tile}>
              <View style={styles.tileIcon}>
                <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color={Palette.primary} />
              </View>
              <Text style={styles.tileLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onPdf} style={styles.pdfRow}>
          <Ionicons name="document-text-outline" size={18} color={Palette.blue} />
          <Text style={styles.pdfLabel}>Gerar PDF do histórico</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: Palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Palette.bgAlt,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryMuted,
  },
  tileLabel: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  pdfLabel: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
});
