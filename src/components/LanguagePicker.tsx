import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Sheet } from './ui';
import { ListRow } from './blocks';
import { SUPPORTED_LANGUAGES, restartApp, setAppLanguage, type LanguageCode } from '../i18n';
import { colors, radius, spacing, textStart, type } from '../theme';

/** Profile row opening the language sheet (Français / English / العربية). */
export const LanguageRow = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((item) => item.code === i18n.language)?.label ?? i18n.language;

  const choose = async (code: LanguageCode) => {
    setOpen(false);
    if (code === i18n.language) return;
    const { restartRequired } = await setAppLanguage(code);
    if (restartRequired) {
      Alert.alert(t('profile.language'), t('profile.languageRestart'), [{ text: t('common.ok'), onPress: () => restartApp() }]);
    }
  };

  return (
    <>
      <ListRow
        icon="language-outline"
        iconTone="accent"
        title={t('profile.language')}
        subtitle={t('profile.languageDesc')}
        trailing={<Badge label={current} size="sm" />}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('profile.chooseLanguage')}>
        <View style={styles.list}>
          {SUPPORTED_LANGUAGES.map((item) => {
            const active = item.code === i18n.language;
            return (
              <Pressable
                key={item.code}
                onPress={() => choose(item.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.optionPressed]}
              >
                <Text style={[type.bodyStrong, textStart(), styles.optionLabel, active && { color: colors.primary }]}>{item.label}</Text>
                {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing(2), paddingBottom: spacing(4) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionPressed: { opacity: 0.85 },
  optionLabel: { flex: 1 },
});
