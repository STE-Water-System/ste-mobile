import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TabBar } from '../../components/TabBar';
import { useAuthStore } from '../../store/authStore';

const ClientLayout = () => {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (hydrated && session?.kind !== 'client') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="bills" options={{ title: t('client.tabBills') }} />
      <Tabs.Screen name="readings" options={{ title: t('client.tabReadings') }} />
      <Tabs.Screen name="complaints" options={{ title: t('client.tabComplaints') }} />
    </Tabs>
  );
};

export default ClientLayout;
