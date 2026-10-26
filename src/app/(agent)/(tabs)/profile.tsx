import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Divider, Header, Screen, SectionTitle } from '../../../components/ui';
import { Avatar, ListRow, StatCard, Toggle } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { useAgentRound } from '../../../hooks/useAgentRound';
import { LanguageRow } from '../../../components/LanguagePicker';
import { MOCK_CONTACT } from '../../../mocks';
import { useAgent, useAuthStore } from '../../../store/authStore';
import { useLocalStore } from '../../../store/localStore';
import { gradients, spacing, textStart, type } from '../../../theme';

/** Account, month summary, preferences and sign-out. */
const AgentProfileScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const agent = useAgent();
  const logout = useAuthStore((state) => state.logout);
  const round = useAgentRound();
  const notificationsEnabled = useLocalStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useLocalStore((state) => state.setNotificationsEnabled);

  const role = agent?.role?.name || agent?.userType || '';
  const stats = round.data?.stats;
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
          <Avatar name={agent?.name || 'A'} size={64} gradient={gradients.agent} />
          <View style={styles.identityText}>
            <Text style={[type.heading, textStart()]} numberOfLines={1}>{agent?.name || '—'}</Text>
            <Text style={[type.caption, textStart()]} numberOfLines={1}>{agent?.email || '—'}</Text>
            {!!role && <Badge label={role} tone="info" size="sm" />}
          </View>
        </Card>
      </Appear>

      <SectionTitle title={t('profile.thisMonth')} />
      <Appear index={1}>
        <View style={styles.grid}>
          <StatCard label={t('agentHome.assigned')} value={stats?.total ?? '—'} icon="list-outline" />
          <StatCard label={t('agentHome.sent')} value={stats ? stats.sent + stats.approved : '—'} icon="paper-plane-outline" tone="success" />
        </View>
      </Appear>

      <SectionTitle title={t('profile.preferences')} />
      <Appear index={2}>
        <Card>
          <Toggle
            icon="notifications-outline"
            label={t('profile.notifications')}
            description={t('profile.notificationsDesc')}
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <Divider inset />
          <LanguageRow />
        </Card>
      </Appear>

      <SectionTitle title={t('profile.support')} />
      <Appear index={3}>
        <Card>
          <ListRow icon="notifications-outline" title={t('nav.notifications')} onPress={() => router.push('/(agent)/notifications')} />
          <Divider inset />
          <ListRow icon="call-outline" iconTone="success" title={t('profile.callSupport')} subtitle={MOCK_CONTACT.hotline} onPress={() => Alert.alert(t('profile.callSupport'), t('profile.callSupportBody', { phone: MOCK_CONTACT.hotline }))} />
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
  grid: { flexDirection: 'row', gap: spacing(3) },
  logout: { marginTop: spacing(6) },
});

export default AgentProfileScreen;
