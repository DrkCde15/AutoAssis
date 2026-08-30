import { PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';

import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';

/* ─── Button ─── */

type ButtonProps = PressableProps & {
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
};

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  fullWidth,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        styles[`button_${variant}`],
        size === 'sm' ? styles.buttonSm : null,
        state.pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        fullWidth ? styles.fullWidth : null,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' || variant === 'secondary' ? Palette.primary : Palette.white} size="small" />
      ) : null}
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`], size === 'sm' ? styles.buttonTextSm : null]}>
        {title ?? (children as ReactNode)}
      </Text>
    </Pressable>
  );
}

/* ─── Field ─── */

type FieldProps = TextInputProps & {
  label: string;
};

export function Field({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={Palette.textSoft}
        style={[styles.input, style]}
      />
    </View>
  );
}

/* ─── Card ─── */

type CardProps = PropsWithChildren<ViewProps & { variant?: 'default' | 'elevated' | 'surface' }>;

export function Card({ children, variant = 'default', style, ...props }: CardProps) {
  return (
    <View {...props} style={[styles.card, variant === 'elevated' ? styles.cardElevated : variant === 'surface' ? styles.cardSurface : null, style]}>
      {children}
    </View>
  );
}

/* ─── Pill ─── */

type PillProps = {
  label?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children?: ReactNode;
};

export function Pill({ label, tone = 'neutral', size = 'md', children }: PillProps) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}`], size === 'sm' ? styles.pillSm : null]}>
      <Text style={[styles.pillText, styles[`pillText_${tone}`], size === 'sm' ? styles.pillTextSm : null]}>
        {label ?? children}
      </Text>
    </View>
  );
}

/* ─── AmbientGlow ─── */

export function AmbientGlow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Palette.bg }]} />
      <View style={[styles.glow, styles.glowOuter]} />
      <View style={[styles.glow, styles.glowMid]} />
      <View style={[styles.glowCyan, styles.glowCyanOuter]} />
    </View>
  );
}

/* ─── LoadingView ─── */

export function LoadingView({ label = 'Carregando...' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <View style={styles.loadingRing}>
        <ActivityIndicator color={Palette.primary} size="large" />
      </View>
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

/* ─── SectionTitle ─── */

export function SectionTitle({
  kicker,
  title,
  subtitle,
  align = 'left',
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  return (
    <View style={[styles.sectionTitleWrap, align === 'center' ? styles.sectionTitleCenter : null]}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={[styles.sectionTitleText, align === 'center' ? styles.sectionTitleTextCenter : null]}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/* ─── Stat ─── */

export function Stat({
  label,
  value,
  hint,
  align = 'left',
}: {
  label: string;
  value: string;
  hint?: string;
  align?: 'left' | 'center';
}) {
  return (
    <View style={[styles.stat, align === 'center' ? styles.statCenter : null]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

/* ─── EmptyState ─── */

type EmptyStateProps = {
  title: string;
  body?: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
};

export function EmptyState({ title, body, message, action, icon }: EmptyStateProps) {
  const detail = body ?? message;
  return (
    <View style={styles.emptyWrap}>
      {icon ? (
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyIconText}>@(icon)</Text>
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyBody}>{detail}</Text> : null}
      {action ? (
        <AppButton variant="secondary" onPress={action.onPress} size="sm">
          {action.label}
        </AppButton>
      ) : null}
    </View>
  );
}

/* ─── Avatar ─── */

export function Avatar({ name, size = 48 }: { name?: string; size?: number }) {
  const initial = (name || 'A').slice(0, 1).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.38 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

/* ─── Separator ─── */

export function Separator({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.separator, style]} />;
}

/* ─── Row ─── */

export function Row({
  left,
  right,
  style,
}: {
  left: ReactNode;
  right?: ReactNode;
  style?: ViewProps['style'];
}) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.rowLeft}>{left}</View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Button */
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    fontFamily: Fonts.sans,
  },
  buttonSm: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
  fullWidth: {
    width: '100%',
  },
  button_primary: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
    ...Shadow.primary,
  },
  button_secondary: {
    backgroundColor: Palette.surfaceStrong,
    borderColor: Palette.border,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  button_danger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    fontFamily: Fonts.sans,
  },
  buttonTextSm: {
    fontSize: 13,
  },
  buttonText_primary: {
    color: Palette.white,
  },
  buttonText_secondary: {
    color: Palette.text,
  },
  buttonText_ghost: {
    color: Palette.textMuted,
  },
  buttonText_danger: {
    color: '#FCA5A5',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },

  /* Field */
  fieldWrap: {
    gap: Spacing.one,
  },
  label: {
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceStrong,
    color: Palette.text,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },

  /* Card */
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.xl,
    padding: Spacing.four,
  },
  cardElevated: {
    ...Shadow.md,
  },
  cardSurface: {
    backgroundColor: Palette.surfaceStrong,
    borderColor: Palette.borderStrong,
  },

  /* Pill */
  pill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
  },
  pillSm: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  pill_neutral: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pill_good: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  pill_warn: {
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  pill_danger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  pill_info: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  pillTextSm: {
    fontSize: 11,
  },
  pillText_neutral: {
    color: Palette.textMuted,
  },
  pillText_good: {
    color: '#86EFAC',
  },
  pillText_warn: {
    color: '#FCD34D',
  },
  pillText_danger: {
    color: '#FCA5A5',
  },
  pillText_info: {
    color: '#93C5FD',
  },

  /* Glow */
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Palette.primary,
    top: -220,
    left: -140,
  },
  glowOuter: { width: 520, height: 520, opacity: 0.04 },
  glowMid: { width: 360, height: 360, top: -160, left: -80, opacity: 0.05 },
  glowCyan: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Palette.blue,
    top: 80,
    right: -200,
  },
  glowCyanOuter: { width: 460, height: 460, opacity: 0.03 },

  /* Loading */
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: Palette.bg,
  },
  loadingRing: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  loadingText: {
    color: Palette.textMuted,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },

  /* SectionTitle */
  sectionTitleWrap: {
    gap: Spacing.one,
  },
  sectionTitleCenter: {
    alignItems: 'center',
  },
  kicker: {
    color: Palette.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: Fonts.sans,
  },
  sectionTitleText: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 28,
    fontFamily: Fonts.serif,
  },
  sectionTitleTextCenter: {
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: Palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },

  /* Stat */
  stat: {
    gap: 2,
  },
  statCenter: {
    alignItems: 'center',
  },
  statLabel: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: Fonts.sans,
  },
  statValue: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
    fontFamily: Fonts.serif,
  },
  statHint: {
    color: Palette.textSoft,
    fontSize: 12,
    fontFamily: Fonts.sans,
  },

  /* EmptyState */
  emptyWrap: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.five,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.one,
  },
  emptyIconText: {
    fontSize: 24,
    color: Palette.textMuted,
  },
  emptyTitle: {
    color: Palette.text,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Fonts.sans,
  },
  emptyBody: {
    color: Palette.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },

  /* Avatar */
  avatar: {
    backgroundColor: Palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Palette.primary,
    fontFamily: Fonts.serif,
    fontWeight: '800',
  },

  /* Separator */
  separator: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Spacing.one,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
  },
  rowRight: {
    flexShrink: 0,
  },
});
