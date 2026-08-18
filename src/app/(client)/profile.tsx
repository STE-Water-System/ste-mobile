import React from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Divider, Header, Line, Screen } from '../../components/ui';
import { formatAddress } from '../../services/api';
import { useAuthStore, useCustomer } from '../../store/authStore';

/** Account details and sign-out. The app follows the device language. */
const ClientProfileScreen = () => {
  const { t } = useTranslation();
  const customer = useCustomer();
  const logout = useAuthStore((state) => state.logout);

  const fullName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
  const address = formatAddress(customer?.address);

  const confirmLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen scroll>
      <Header title={t('client.tabProfile')} subtitle={fullName} />

      <Card>
        <Line label={t('auth.clientCode')} value={customer?.customerCode || '—'} />
        <Divider />
        <Line label={t('auth.phone')} value={customer?.phone || '—'} />
        {!!address && (
          <>
            <Divider />
            <Line label={t('agent.address')} value={address} />
          </>
        )}
        <Divider />
        <Line label={t('client.tabReadings')} value={String(customer?.meters?.length ?? 0)} />
      </Card>

      <Button label={t('settings.logout')} variant="danger" onPress={confirmLogout} />
    </Screen>
  );
};

export default ClientProfileScreen;
