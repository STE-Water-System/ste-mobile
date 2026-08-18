import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const RTL_LANGUAGES: string[] = ['ar'];

export const isRTLLanguage = (language: string) => RTL_LANGUAGES.includes(language);

const isSupported = (language?: string | null): language is LanguageCode =>
  !!language && SUPPORTED_LANGUAGES.some((item) => item.code === language);

/** The app has no language picker: it follows the phone, French otherwise. */
const resolveInitialLanguage = async (): Promise<LanguageCode> => {
  try {
    const device = Localization.getLocales()[0]?.languageCode;
    if (isSupported(device)) return device;
  } catch {
    // Fall through to the default.
  }
  return 'fr';
};

/**
 * Initialise i18n and align the native layout direction with the stored
 * language. Native RTL is sticky across restarts, so it is set before the first
 * render rather than on every language change.
 */
export const initI18n = async () => {
  const language = await resolveInitialLanguage();

  const shouldBeRTL = isRTLLanguage(language);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: language,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  return i18n;
};

export default i18n;
