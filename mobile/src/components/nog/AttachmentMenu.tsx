import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';

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
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
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
        <View style={styles.row}>
          {quick.map((action) => (
            <Pressable key={action.label} onPress={action.onPress} style={styles.tile}>
              <View style={styles.tileIcon}>
                <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={22} color={Palette.primary} />
              </View>
              <Text style={styles.tileLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onPdf} style={styles.pdfRow}>
          <Ionicons name="document-text-outline" size={20} color={Palette.blue} />
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
    backgroundColor: 'rgba(24,24,27,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,92,255,0.3)',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Shadow.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.28)',
  },
  tileLabel: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  pdfLabel: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
});
