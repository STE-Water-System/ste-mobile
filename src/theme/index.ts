import { I18nManager, Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Design tokens for the STE app.
 *
 * Visual language: a soft slate canvas with white, gently rounded cards; one
 * deep "water" blue as the accent, a teal secondary for consumption data, and
 * semantic greens / ambers / reds for statuses. Every screen is built from
 * these tokens so both the Agent and Customer spaces read as one product.
 */

export const colors = {
  // Surfaces
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F8',
  surfaceMuted: '#F8FAFD',
  border: '#E4E9F2',

  // Text
  text: '#0B1324',
  textMuted: '#475569',
  textSubtle: '#6B7A90',
  placeholder: '#9AA6B8',
  onPrimary: '#FFFFFF',

  // Brand
  primary: '#0B63E5',
  primaryDark: '#0847B5',
  primarySoft: '#E7F0FF',
  accent: '#0EA5C9',
  accentSoft: '#E1F6FB',

  // Status
  success: '#0E9F6E',
  successSoft: '#E4F7EF',
  warning: '#D97706',
  warningSoft: '#FFF3E0',
  danger: '#DC2626',
  dangerSoft: '#FEECEC',
  info: '#0B63E5',
  infoSoft: '#E7F0FF',

  white: '#FFFFFF',
  overlay: 'rgba(11, 19, 36, 0.45)',
} as const;

/** Gradient stops used by hero cards and the login backdrop. */
export const gradients = {
  primary: ['#0B63E5', '#1E8BF0'] as const,
  hero: ['#0A3F9F', '#0B63E5', '#1EA3EA'] as const,
  agent: ['#0F3B82', '#0B63E5'] as const,
  client: ['#0B63E5', '#0EA5C9'] as const,
  success: ['#0E9F6E', '#22C58B'] as const,
  warning: ['#D97706', '#F2A33A'] as const,
  danger: ['#DC2626', '#F0605D'] as const,
  surface: ['#FFFFFF', '#F4F6FB'] as const,
};

/** Rounded corners: pills for controls, `lg`/`xl` for cards and sheets. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 9999,
} as const;

/** 4pt grid. */
export const spacing = (steps: number) => steps * 4;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontSize: 28, fontFamily: fonts.extrabold, color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 22, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  subheading: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  body: { fontSize: 14, fontFamily: fonts.regular, color: colors.text, lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text, lineHeight: 20 },
  label: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSubtle, lineHeight: 16 },
  tiny: { fontSize: 10.5, fontFamily: fonts.semibold, color: colors.textSubtle, letterSpacing: 0.4 },
  amount: { fontSize: 20, fontFamily: fonts.extrabold, color: colors.text },
  /** Hero figure: the outstanding balance or the month's progress. */
  balance: { fontSize: 32, fontFamily: fonts.extrabold, color: colors.text, letterSpacing: -0.8 },
};

export const shadow: Record<string, ViewStyle> = {
  /** Barely-there lift for chips and pills. */
  soft: Platform.select({
    ios: { shadowColor: '#0B1324', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
    default: { elevation: 1 },
  })!,
  /** Standard card elevation on the slate canvas. */
  card: Platform.select({
    ios: { shadowColor: '#0B1324', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14 },
    default: { elevation: 2 },
  })!,
  /** Floating surfaces: tab bar, sheets, FAB. */
  float: Platform.select({
    ios: { shadowColor: '#0B1324', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24 },
    default: { elevation: 8 },
  })!,
  /** Blue glow under primary buttons and hero cards. */
  accent: Platform.select({
    ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
    default: { elevation: 4 },
  })!,
};

/** Animation durations (ms). */
export const motion = { fast: 140, base: 240, slow: 420 } as const;

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/** True when the active locale lays out right-to-left. */
export const isRTL = () => I18nManager.isRTL;

/** Mirrors a directional glyph (arrows) without needing a second asset. */
export const arrowForward = () => (I18nManager.isRTL ? '←' : '→');
export const arrowBack = () => (I18nManager.isRTL ? '→' : '←');

/** Ionicons chevron names that follow the writing direction. */
type Chevron = 'chevron-back' | 'chevron-forward';
export const chevronForward = (): Chevron => (I18nManager.isRTL ? 'chevron-back' : 'chevron-forward');
export const chevronBack = (): Chevron => (I18nManager.isRTL ? 'chevron-forward' : 'chevron-back');

/**
 * Text alignment that follows the writing direction. React Native only honours
 * `textAlign: 'left' | 'right'` literally, so alignment has to be resolved.
 */
export const textStart = (): TextStyle => ({
  textAlign: I18nManager.isRTL ? 'right' : 'left',
  writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
});

/** Trailing alignment — the opposite edge of `textStart`. */
export const textEnd = (): TextStyle => ({
  textAlign: I18nManager.isRTL ? 'left' : 'right',
  writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
});

/** Tone → colour pair, shared by badges, notices, stat cards and icons. */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.textMuted, bg: colors.surfaceAlt },
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.primary, bg: colors.primarySoft },
  accent: { fg: colors.accent, bg: colors.accentSoft },
};
