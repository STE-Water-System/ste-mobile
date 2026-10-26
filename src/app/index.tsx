import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../store/authStore';
import { colors, gradients, radius, shadow } from '../theme';

/** Entry gate: shows the mark while the stored session loads, then routes by role. */
const Entry = () => {
  const hydrated = useAuthStore((state) => state.hydrated);
  const session = useAuthStore((state) => state.session);

  if (!hydrated) {
    return (
      <LinearGradient colors={gradients.hero} style={styles.container}>
        <View style={styles.logoFrame}>
          <Image source={require('../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
        </View>
      </LinearGradient>
    );
  }

  if (session?.kind === 'agent') return <Redirect href="/(agent)/(tabs)/home" />;
  if (session?.kind === 'client') return <Redirect href="/(client)/(tabs)/home" />;
  return <Redirect href="/(auth)/login" />;
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoFrame: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  logo: { width: 64, height: 64 },
});

export default Entry;
