import React from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Divider, Header, Line, Screen } from '../../components/ui';
import { useAgent, useAuthStore } from '../../store/authStore';

/** Account details and sign-out. The app follows the device language. */
const AgentProfileScreen = () => {
  const { t } = useTranslation();
  const agent = useAgent();
  const logout = useAuthStore((state) => state.logout);

  const role = agent?.role?.name || agent?.userType;

  const confirmLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen scroll>
      <Header title={t('agent.tabProfile')} subtitle={agent?.name} />

      <Card>
        <Line label={t('auth.email')} value={agent?.email || '—'} />
        {!!role && (
          <>
            <Divider />
            <Line label={t('agent.role')} value={role} />
          </>
        )}
      </Card>

      <Button label={t('settings.logout')} variant="danger" onPress={confirmLogout} />
    </Screen>
  );
};

export default AgentProfileScreen;
