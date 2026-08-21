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

type ButtonProps = PressableProps & {
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
};

export function AppButton({
  title,
  variant = 'primary',
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
        state.pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        fullWidth ? styles.fullWidth : null,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {loading ? <ActivityIndicator color={variant === 'ghost' ? Palette.primary : Palette.white} /> : null}
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{title ?? (children as ReactNode)}</Text>
    </Pressable>
  );
}

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

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}

type PillProps = {
  label?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'info';
  children?: ReactNode;
};

export function Pill({ label, tone = 'neutral', children }: PillProps) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}`]]}>
      <Text style={[styles.pillText, styles[`pillText_${tone}`]]}>{label ?? children}</Text>
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  body?: string;
  message?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, body, message, action }: EmptyStateProps) {
  const detail = body ?? message;
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyBody}>{detail}</Text> : null}
      {action ? (
        <AppButton variant="secondary" onPress={action.onPress}>
          {action.label}
        </AppButton>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    fontFamily: Fonts.sans,
  },
  fullWidth: {
    width: '100%',
  },
  button_primary: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
    ...Shadow.md,
  },
  button_secondary: {
    backgroundColor: Palette.surfaceStrong,
    borderColor: Palette.borderStrong,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: Palette.border,
  },
  button_danger: {
    backgroundColor: Palette.red,
    borderColor: Palette.red,
    ...Shadow.md,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  buttonText_primary: {
    color: Palette.white,
  },
  buttonText_secondary: {
    color: Palette.text,
  },
  buttonText_ghost: {
    color: Palette.text,
  },
  buttonText_danger: {
    color: Palette.white,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  fieldWrap: {
    gap: Spacing.one,
  },
  label: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceStrong,
    color: Palette.text,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    ...Shadow.md,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: 1,
  },
  pill_neutral: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pill_good: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  pill_warn: {
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  pill_danger: {
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  pill_info: {
    backgroundColor: 'rgba(59,130,246,0.14)',
    borderColor: 'rgba(59,130,246,0.35)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Fonts.sans,
  },
  pillText_neutral: {
    color: 'rgba(250,250,250,0.62)',
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
  empty: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyTitle: {
    color: Palette.text,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Fonts.sans,
  },
  emptyBody: {
    color: Palette.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
});
