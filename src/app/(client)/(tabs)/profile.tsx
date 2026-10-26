import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Divider, Header, Line, Screen, SectionTitle } from '../../../components/ui';
import { Avatar, ListRow, Toggle } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { LanguageRow } from '../../../components/LanguagePicker';
import { MOCK_CONTACT } from '../../../mocks';
import { formatAddress } from '../../../services/api';
import { useAuthStore, useCustomer } from '../../../store/authStore';
import { useLocalStore } from '../../../store/localStore';
import { gradients, spacing, textStart, type } from '../../../theme';

/** Account details, preferences and sign-out. */
const ClientProfileScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const logout = useAuthStore((state) => state.logout);
  const notificationsEnabled = useLocalStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useLocalStore((state) => state.setNotificationsEnabled);

  const fullName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
  const address = formatAddress(customer?.address);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const confirmLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen scroll>
      <Header title={t('nav.profile')} />

      <Appear>
        <Card style={styles.identity}>
          <Avatar name={fullName || customer?.customerCode || '?'} size={64} gradient={gradients.client} />
          <View style={styles.identityText}>
            <Text style={[type.heading, textStart()]} numberOfLines={1}>{fullName || '—'}</Text>
            <Text style={[type.caption, textStart()]} numberOfLines={1}>{customer?.customerCode}</Text>
            {!!customer?.category && <Badge label={String(customer.category)} tone="info" size="sm" />}
          </View>
        </Card>
      </Appear>

      <SectionTitle title={t('profile.account')} />
      <Appear index={1}>
        <Card>
          <Line label={t('auth.phone')} value={customer?.phone || '—'} />
          {!!address && (
            <>
              <Divider />
              <Line label={t('agent.address')} value={address} />
            </>
          )}
          <Divider />
          <Line label={t('profile.meters')} value={String(customer?.meters?.length ?? 0)} />
        </Card>
      </Appear>

      <SectionTitle title={t('profile.preferences')} />
      <Appear index={2}>
        <Card>
          <Toggle icon="notifications-outline" label={t('profile.notifications')} description={t('profile.notificationsDescClient')} value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
          <Divider inset />
          <LanguageRow />
        </Card>
      </Appear>

      <SectionTitle title={t('profile.support')} />
      <Appear index={3}>
        <Card>
          <ListRow icon="business-outline" iconTone="success" title={t('services.agencies')} onPress={() => router.push('/(client)/agencies')} />
          <Divider inset />
          <ListRow icon="call-outline" iconTone="success" title={t('profile.callSupport')} subtitle={MOCK_CONTACT.hotline} onPress={() => Alert.alert(t('profile.callSupport'), t('profile.callSupportBody', { phone: MOCK_CONTACT.hotline }))} />
          <Divider inset />
          <ListRow icon="help-circle-outline" iconTone="neutral" title={t('auth.helpTitle')} subtitle={t('auth.helpBody')} chevron={false} />
          <Divider inset />
          <ListRow icon="information-circle-outline" iconTone="neutral" title={t('profile.about')} subtitle={t('profile.version', { version })} chevron={false} />
        </Card>
      </Appear>

      <Appear index={4}>
        <Button label={t('settings.logout')} variant="danger" icon="log-out-outline" onPress={confirmLogout} style={styles.logout} />
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing(4) },
  identityText: { flex: 1, gap: 4, alignItems: 'flex-start' },
  logout: { marginTop: spacing(6) },
});

export default ClientProfileScreen;
