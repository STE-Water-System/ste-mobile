import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

/** Agent space: a stack whose first screen is the tab bar, plus detail screens pushed over it. */
const AgentLayout = () => {
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (hydrated && session?.kind !== 'agent') return <Redirect href="/" />;

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

export default AgentLayout;
