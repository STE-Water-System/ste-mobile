import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

/** Customer space: tabs first, self-service screens pushed over them. */
const ClientLayout = () => {
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (hydrated && session?.kind !== 'client') return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
};

export default ClientLayout;
