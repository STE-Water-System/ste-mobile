import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

const AuthLayout = () => {
  const session = useAuthStore((state) => state.session);

  // Someone already signed in has no business on the login or OTP screens.
  if (session) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
    </Stack>
  );
};

export default AuthLayout;
