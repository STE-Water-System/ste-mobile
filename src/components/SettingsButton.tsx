import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { changeLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n';
import { useAuthStore } from '../store/authStore';
import { colors, radius, spacing } from '../theme';
import { Button, Sheet } from './ui';

/**
 * The single header action of every screen: language and sign-out, in a sheet.
 * Keeping them here is what lets the rest of the screens stay chrome-free.
 */
export const SettingsButton = () => {
  const { t, i18n } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);

  const current = i18n.language as LanguageCode;

  const pickLanguage = async (code: LanguageCode) => {
    if (code === current) return;
    const { needsRestart } = await changeLanguage(code);
    // Arabic flips the native layout direction, which only applies after a reload.
    if (needsRestart) Alert.alert(t('settings.restartTitle'), t('settings.restartBody'));
  };

  const confirmLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          setOpen(false);
          await logout();
        },
      },
    ]);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.triggerLabel}>{current.toUpperCase()}</Text>
      </TouchableOpacity>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('settings.title')}>
        <View style={styles.languages}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const active = language.code === current;
            return (
              <TouchableOpacity
                key={language.code}
                style={[styles.language, active && styles.languageActive]}
                onPress={() => pickLanguage(language.code)}
                activeOpacity={0.85}
              >
                <Text style={[styles.languageLabel, active && styles.languageLabelActive]}>
                  {language.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button label={t('settings.logout')} variant="danger" onPress={confirmLogout} />
      </Sheet>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    height: 34,
    minWidth: 46,
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  languages: { gap: spacing(2), marginBottom: spacing(5) },
  language: {
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  languageLabel: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted },
  languageLabelActive: { color: colors.primary, fontWeight: '700' },
});

export default SettingsButton;
