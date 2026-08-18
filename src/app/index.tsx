import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuthStore } from '../store/authStore';
import { colors, radius, shadow } from '../theme';

/** Entry gate: shows the mark while the stored session loads, then routes by role. */
const Entry = () => {
  const hydrated = useAuthStore((state) => state.hydrated);
  const session = useAuthStore((state) => state.session);

  if (!hydrated) {
    return (
      <View style={styles.container}>
        <View style={styles.logoFrame}>
          <Image source={require('../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
        </View>
      </View>
    );
  }

  if (session?.kind === 'agent') return <Redirect href="/(agent)/reading" />;
  if (session?.kind === 'client') return <Redirect href="/(client)/bills" />;
  return <Redirect href="/(auth)/login" />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  logo: { width: 60, height: 60 },
});

export default Entry;
