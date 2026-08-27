import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Palette, Spacing } from '@/constants/theme';

type VoiceRecorderProps = {
  seconds: number;
  waveform: number[];
};

function formatTime(total: number) {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(total % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function VoiceRecorder({ seconds, waveform }: VoiceRecorderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.wave}>
        {waveform.map((value, index) => (
          <View key={index} style={[styles.bar, { height: Math.max(4, value * 28) }]} />
        ))}
      </View>
      <Text style={styles.timer}>{formatTime(seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  wave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  bar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: Palette.primary,
  },
  timer: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.sans,
    minWidth: 42,
    textAlign: 'right',
  },
});
