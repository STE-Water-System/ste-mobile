import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const LANGUAGE_STORAGE_KEY = 'app_language';

/** Stored preference first, then the phone language, French otherwise. */
const resolveInitialLanguage = async (): Promise<LanguageCode> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    // Fall through to the device language.
  }
  try {
    const device = Localization.getLocales()[0]?.languageCode;
    if (isSupported(device)) return device;
  } catch {
    // Fall through to the default.
  }
  return 'fr';
};

/**
 * Switch the app language (customer and agent spaces). Returns whether a
 * restart is needed: native layout direction only changes on the next start.
 */
export const setAppLanguage = async (language: LanguageCode): Promise<{ restartRequired: boolean }> => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
  const shouldBeRTL = isRTLLanguage(language);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    return { restartRequired: true };
  }
  return { restartRequired: false };
};

/** Reload the JS bundle so the new layout direction applies. */
export const restartApp = async () => {
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('Restart the app to apply the new language direction', error);
  }
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
