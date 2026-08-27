import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Palette, Shadow } from '@/constants/theme';

type SendButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function SendButton({ onPress, disabled, loading }: SendButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.disabled : styles.enabled,
        pressed && !isDisabled ? styles.pressed : null,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={Palette.white} />
      ) : (
        <Ionicons name="arrow-up" size={22} color={Palette.white} />
      )}
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
  },
  enabled: {
    backgroundColor: Palette.primary,
    borderWidth: 1,
    borderColor: Palette.primary,
    ...Shadow.md,
  },
  disabled: {
    backgroundColor: Palette.bgAlt,
    borderWidth: 1,
    borderColor: Palette.border,
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});
