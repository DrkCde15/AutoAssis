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
      <Ionicons name="mic" size={20} color={recording ? Palette.white : Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.3)',
  },
  buttonRecording: {
    backgroundColor: Palette.red,
    borderColor: Palette.red,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
