import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Palette } from '@/constants/theme';

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
      <Ionicons name={active ? 'close' : 'add'} size={22} color={active ? Palette.white : Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  buttonActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
});
