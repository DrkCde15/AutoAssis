import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  bg: '#09090B',
  bgAlt: '#18181B',
  surface: '#1C1C1F',
  surfaceStrong: '#1F1F25',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textSoft: '#71717A',
  primary: '#7C5CFF',
  primaryDark: '#5B3FE0',
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
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const Glass = {
  header: 'rgba(9, 9, 11, 0.82)',
  tabBar: 'rgba(9, 9, 11, 0.9)',
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  lg: {
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
} as const;
