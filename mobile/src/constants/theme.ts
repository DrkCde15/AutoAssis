import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  bg: '#09090B',
  bgAlt: '#18181B',
  surface: '#1C1C1F',
  surfaceStrong: '#232329',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textSoft: '#71717A',
  primary: '#7C5CFF',
  primaryDark: '#5B3FE0',
  primaryMuted: 'rgba(124,92,255,0.14)',
  accent: '#A78BFA',
  blue: '#3B82F6',
  cyan: '#22D3EE',
  amber: '#F59E0B',
  red: '#EF4444',
  green: '#22C55E',
  white: '#FFFFFF',
} as const;

export const Gradients = {
  brand: ['#7C5CFF', '#3B82F6'] as [string, string],
  brandSoft: ['rgba(124,92,255,0.18)', 'rgba(59,130,246,0.10)'] as [string, string],
};

export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.bg,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.bgAlt,
    textSecondary: Palette.textMuted,
  },
  dark: {
    text: Palette.text,
    background: Palette.bg,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.bgAlt,
    textSecondary: Palette.textMuted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Outfit',
    serif: 'Fraunces',
    rounded: 'Outfit',
    mono: 'monospace',
  },
  default: {
    sans: 'Outfit',
    serif: 'Fraunces',
    rounded: 'Outfit',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  eight: 48,
  ten: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Glass = {
  header: 'rgba(9, 9, 11, 0.82)',
  tabBar: 'rgba(9, 9, 11, 0.9)',
  surface: 'rgba(28, 28, 31, 0.6)',
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  primary: {
    shadowColor: Palette.primary,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
} as const;
