import { I18nManager, Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Design tokens for the STE app.
 *
 * The visual language comes from the login screen: white canvas, fully rounded
 * shapes, muted slate text and a single blue accent. Everything else in the app
 * is built from these tokens so the styling stays consistent.
 */

export const colors = {
  // Surfaces
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',

  // Text
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#64748B',
  placeholder: '#94A3B8',

  // Brand
  primary: '#2563EB',
  primarySoft: '#EFF6FF',

  // Status
  success: '#047857',
  successSoft: '#ECFDF5',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  white: '#FFFFFF',
} as const;

/** Fully rounded is the default; `md` is for large surfaces where a pill looks wrong. */
export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 9999,
} as const;

/** 4pt grid. */
export const spacing = (steps: number) => steps * 4;

export const fonts = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const type: Record<string, TextStyle> = {
  title: { fontSize: 20, fontFamily: fonts.bold, color: colors.text },
  heading: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  body: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  bodyStrong: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  label: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textMuted },
  caption: { fontSize: 11.5, fontFamily: fonts.regular, color: colors.textSubtle },
  amount: { fontSize: 19, fontFamily: fonts.extrabold, color: colors.text },
  /** Hero figure — the outstanding balance at the top of a screen. */
  balance: { fontSize: 30, fontFamily: fonts.extrabold, color: colors.text },
};

export const shadow: Record<string, ViewStyle> = {
  /** Barely-there lift used for active pills and floating surfaces. */
  soft: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 5,
    },
    default: { elevation: 2 },
  })!,
  accent: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    default: { elevation: 3 },
  })!,
};

/** True when the active locale lays out right-to-left. */
export const isRTL = () => I18nManager.isRTL;

/** Mirrors a directional glyph (arrows) without needing a second asset. */
export const arrowForward = () => (I18nManager.isRTL ? '←' : '→');
export const arrowBack = () => (I18nManager.isRTL ? '→' : '←');

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
