import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, Line, MockBanner, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Timeline } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { requestTimeline, useRequestRecords } from '../../../hooks/useClientRecords';
import { formatCurrency } from '../../../services/api';
import { formatDate, requestTone } from '../../../lib/format';
import { spacing, textStart, type } from '../../../theme';

/** MOCK — one installation request and where it stands in the connection flow. */
const RequestDetailScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useRequestRecords().find((row) => row.id === id);

  if (!record) {
    return (
      <Screen>
        <Header title={t('services.requests')} onBack={() => router.back()} />
        <Empty text={t('requests.notFound')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title={record.reference} subtitle={t(`installation.kind.${record.kind}`)} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Card>
          <View style={styles.head}>
            <Text style={[type.heading, textStart(), styles.title]}>{t(`installation.kind.${record.kind}`)}</Text>
            <Badge label={t(`requestStatus.${record.status}`)} tone={requestTone(record.status)} />
          </View>
          <Line label={t('installation.address')} value={[record.street, record.door, record.quarter].filter(Boolean).join(', ')} />
          {!!record.usage && (
            <>
              <Divider />
              <Line label={t('installation.usageLabel')} value={t(`installation.usage.${record.usage}`)} />
            </>
          )}
          {record.amount != null && (
            <>
              <Divider />
              <Line label={t('requests.amount')} value={`${formatCurrency(record.amount)} ${t('common.currency')}`} strong />
            </>
          )}
          <Divider />
          <Line label={t('complaintsList.filedOn')} value={formatDate(record.createdAt)} />
        </Card>
      </Appear>

      <SectionTitle title={t('requests.progress')} />
      <Appear index={1}>
        <Card>
          <Timeline
            items={requestTimeline(record.status, record.createdAt, record.updatedAt).map((step) => ({
              title: t(step.labelKey),
              date: step.date ? formatDate(step.date) : undefined,
              state: step.state,
            }))}
          />
        </Card>
      </Appear>

      <Appear index={2}>
        <Notice text={t(`requests.next.${record.status}`)} tone={record.status === 'COMPLETED' ? 'success' : 'info'} icon="information-circle-outline" style={styles.notice} />
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), marginBottom: spacing(2) },
  title: { flex: 1 },
  notice: { marginTop: spacing(4) },
});

export default RequestDetailScreen;
