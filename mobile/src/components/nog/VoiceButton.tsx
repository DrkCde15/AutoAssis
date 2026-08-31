import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Palette } from '@/constants/theme';

type VoiceButtonProps = {
  onPress: () => void;
  recording?: boolean;
};

export function VoiceButton({ onPress, recording }: VoiceButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, recording ? styles.buttonRecording : null, pressed ? styles.pressed : null]}>
      <Ionicons name="mic" size={18} color={recording ? Palette.white : Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    backgroundColor: Palette.red,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
});
