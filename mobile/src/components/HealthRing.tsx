import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';

export function scoreColor(score: number): string {
  if (score >= 80) return Palette.green;
  if (score >= 50) return Palette.amber;
  return Palette.red;
}

type Props = {
  score: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
};

/** Anel de saúde (sem SVG): track + arco colorido que varre conforme o score. */
export function HealthRing({ score, size = 120, stroke = 12, showLabel = true }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(clamped);
  const rotation = (clamped / 100) * 360 - 90;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.track, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke }]} />
      <View
        style={[
          styles.arc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: color,
            borderRightColor: Palette.bgAlt,
            borderBottomColor: Palette.bgAlt,
            transform: [{ rotate: `${rotation}deg` }],
            opacity: clamped > 0 ? 1 : 0,
          },
        ]}
      />
      <View style={styles.center}>
        <Text style={[styles.value, { color }]}>{clamped}%</Text>
        {showLabel ? <Text style={styles.label}>Saúde</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', borderColor: Palette.bgAlt },
  arc: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 26, fontFamily: Fonts.serif, fontWeight: '900', lineHeight: 30 },
  label: { fontSize: 12, color: Palette.textMuted, fontWeight: '700', letterSpacing: 0.5 },
});
