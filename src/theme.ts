// GymSlot design system — a light, premium, Cult.fit-inspired language:
// clean white surfaces, near-black ink, one confident emerald accent, real depth.

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  bgSubtle: '#F4F6F8', // page background behind cards
  surface: '#FFFFFF',
  surfaceAlt: '#F4F6F8',
  surfaceSunken: '#EEF1F4',
  overlay: 'rgba(14, 17, 22, 0.45)',

  // Ink
  text: '#0E1116',
  textMuted: '#5B6573',
  textSubtle: '#98A1AE',
  onPrimary: '#FFFFFF',
  onDark: '#FFFFFF',

  // Brand
  primary: '#10B981', // emerald — "go, move, active"
  primaryDark: '#0E9F6E',
  primaryTint: '#E7F8F1', // soft fill behind primary content
  ink: '#111418', // near-black, for high-contrast CTAs & hero scrims
  accent: '#6366F1', // indigo — events / secondary highlights
  accentTint: '#ECECFE',

  // Lines
  border: '#E7EAEE',
  borderStrong: '#D7DCE2',

  // Feedback
  danger: '#EF4444',
  dangerTint: '#FDECEC',
  warning: '#F59E0B',
  warningTint: '#FEF3E2',
  success: '#10B981',
  star: '#F59E0B',

  // Crowd buckets (tuned for light backgrounds)
  crowdLow: '#10B981',
  crowdModerate: '#F59E0B',
  crowdHigh: '#FB7185',
  crowdFull: '#EF4444',
  crowdUnknown: '#98A1AE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Inter, loaded in app/_layout.tsx via @expo-google-fonts/inter.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

// Type scale: { fontSize, lineHeight, fontFamily, letterSpacing }
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fonts.black, letterSpacing: -0.6 },
  h1: { fontSize: 26, lineHeight: 32, fontFamily: fonts.extrabold, letterSpacing: -0.4 },
  h2: { fontSize: 21, lineHeight: 27, fontFamily: fonts.bold, letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 23, fontFamily: fonts.bold, letterSpacing: -0.2 },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  small: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  smallStrong: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold },
  tiny: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: 0.3 },
  label: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bold, letterSpacing: 0.8 },
} as const;

// Legacy numeric font sizes kept for any spot that wants a raw size.
export const font = {
  h1: 26,
  h2: 21,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

// Elevation presets — iOS shadow + Android elevation in one spread.
export const shadow = {
  none: {},
  sm: {
    shadowColor: '#0E1116',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0E1116',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  lg: {
    shadowColor: '#0E1116',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const;

export type ColorToken = keyof typeof colors;
