import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { initI18n } from '../i18n';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [ready, setReady] = useState(false);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    // i18n sets the native layout direction, so it has to settle before anything renders.
    (async () => {
      try {
        await initI18n();
      } finally {
        setReady(true);
      }
    })();
    hydrate();
  }, [hydrate]);

  if (!fontsLoaded || !ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </QueryClientProvider>
  );
};

export default RootLayout;
