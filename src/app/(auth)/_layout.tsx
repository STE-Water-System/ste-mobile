import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '../../store/authStore';

const AuthLayout = () => {
  const session = useAuthStore((state) => state.session);

  // Someone already signed in has no business on the login screen.
  if (session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default AuthLayout;
