import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TabBar } from '../../components/TabBar';
import { useAuthStore } from '../../store/authStore';

const AgentLayout = () => {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (hydrated && session?.kind !== 'agent') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="reading" options={{ title: t('agent.tabReading') }} />
      <Tabs.Screen name="clients" options={{ title: t('agent.tabClients') }} />
    </Tabs>
  );
};

export default AgentLayout;
