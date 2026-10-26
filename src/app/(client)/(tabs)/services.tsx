import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card, Divider, Header, Screen, SectionTitle } from '../../../components/ui';
import { ListRow } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { useComplaintRecords, useRequestRecords } from '../../../hooks/useClientRecords';
import { spacing } from '../../../theme';

/** Self-service hub: every request a customer can make, grouped by purpose. */
const ServicesScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const complaints = useComplaintRecords();
  const requests = useRequestRecords();
  const openComplaints = complaints.filter((row) => row.status === 'Open' || row.status === 'In_Progress').length;
  const openRequests = requests.filter((row) => row.status !== 'COMPLETED').length;

  return (
    <Screen scroll>
      <Header title={t('nav.services')} subtitle={t('services.subtitle')} />

      <SectionTitle title={t('services.groupRequests')} style={styles.firstSection} />
      <Appear>
        <Card padded={false} style={styles.card}>
          <ListRow icon="chatbubble-ellipses-outline" iconTone="danger" title={t('services.reclamation')} subtitle={t('services.reclamationDesc')} onPress={() => router.push('/(client)/reclamation')} />
          <Divider inset />
          <ListRow icon="list-outline" title={t('services.complaints')} subtitle={openComplaints ? t('services.openCount', { count: openComplaints }) : t('services.complaintsDesc')} onPress={() => router.push('/(client)/complaints')} />
          <Divider inset />
          <ListRow icon="construct-outline" iconTone="accent" title={t('services.installation')} subtitle={t('services.installationDesc')} onPress={() => router.push('/(client)/installation')} />
          <Divider inset />
          <ListRow icon="document-text-outline" iconTone="accent" title={t('services.requests')} subtitle={openRequests ? t('services.openCount', { count: openRequests }) : t('services.requestsDesc')} onPress={() => router.push('/(client)/requests')} />
          <Divider inset />
          <ListRow icon="shield-checkmark-outline" iconTone="success" title={t('services.verification')} subtitle={t('services.verificationDesc')} onPress={() => router.push('/(client)/verification')} />
        </Card>
      </Appear>

      <SectionTitle title={t('services.groupAccount')} />
      <Appear index={1}>
        <Card padded={false} style={styles.card}>
          <ListRow icon="wallet-outline" title={t('services.pay')} subtitle={t('services.payDesc')} onPress={() => router.push('/(client)/pay')} />
          <Divider inset />
          <ListRow icon="camera-outline" iconTone="warning" title={t('services.selfReading')} subtitle={t('services.selfReadingDesc')} onPress={() => router.push('/(client)/self-reading')} />
          <Divider inset />
          <ListRow icon="receipt-outline" iconTone="neutral" title={t('nav.bills')} subtitle={t('services.billsDesc')} onPress={() => router.push('/(client)/(tabs)/bills')} />
        </Card>
      </Appear>

      <SectionTitle title={t('services.groupInfo')} />
      <Appear index={2}>
        <Card padded={false} style={styles.card}>
          <ListRow icon="water-outline" iconTone="warning" title={t('services.outages')} subtitle={t('services.outagesDesc')} onPress={() => router.push('/(client)/outages')} />
          <Divider inset />
          <ListRow icon="business-outline" iconTone="success" title={t('services.agencies')} subtitle={t('services.agenciesDesc')} onPress={() => router.push('/(client)/agencies')} />
          <Divider inset />
          <ListRow icon="notifications-outline" iconTone="neutral" title={t('nav.notifications')} subtitle={t('services.notificationsDesc')} onPress={() => router.push('/(client)/notifications')} />
        </Card>
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: { marginTop: 0 },
  card: { paddingHorizontal: spacing(4) },
});

export default ServicesScreen;
