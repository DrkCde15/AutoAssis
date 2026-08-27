import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

export type NogImage = { uri: string; base64: string };

type AttachmentButtonProps = {
  active?: boolean;
  onPress: () => void;
};

export function AttachmentButton({ active, onPress }: AttachmentButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        active ? styles.buttonActive : null,
        pressed ? styles.pressed : null,
      ]}>
      <Ionicons name={active ? 'close' : 'add'} size={24} color={active ? Palette.white : Palette.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceStrong,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  buttonActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
