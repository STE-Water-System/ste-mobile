import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, Line, MockBanner, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Timeline } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { useComplaintRecords } from '../../../hooks/useClientRecords';
import { complaintTone, formatDate } from '../../../lib/format';
import { spacing, textStart, type } from '../../../theme';

/** MOCK — one complaint with its follow-up timeline. */
const ComplaintDetailScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useComplaintRecords().find((row) => row.id === id);

  if (!record) {
    return (
      <Screen>
        <Header title={t('services.complaints')} onBack={() => router.back()} />
        <Empty text={t('complaintsList.notFound')} />
      </Screen>
    );
  }

  const subject = record.subjectKey ? t(record.subjectKey) : record.subject;

  return (
    <Screen scroll>
      <Header title={record.reference} subtitle={t(`complaints.type_${record.category}`, record.category)} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Card>
          <View style={styles.head}>
            <Text style={[type.heading, textStart(), styles.subject]}>{subject}</Text>
            <Badge label={t(`complaintStatus.${record.status}`)} tone={complaintTone(record.status)} />
          </View>
          {!!record.description && <Text style={[type.body, textStart(), styles.description]}>{record.description}</Text>}
          <Divider />
          <Line label={t('reclamation.priority')} value={t(`complaints.priority_${record.priority}`, record.priority)} />
          <Divider />
          <Line label={t('complaintsList.filedOn')} value={formatDate(record.createdAt)} />
          <Divider />
          <Line label={t('complaintsList.updatedOn')} value={formatDate(record.updatedAt)} />
        </Card>
      </Appear>

      <SectionTitle title={t('complaintsList.progress')} />
      <Appear index={1}>
        <Card>
          <Timeline
            items={record.timeline.map((step) => ({
              title: t(step.labelKey),
              date: step.date ? formatDate(step.date) : undefined,
              state: step.state,
            }))}
          />
        </Card>
      </Appear>

      <Appear index={2}>
        <Notice text={record.status === 'Resolved' || record.status === 'Closed' ? t('complaintsList.closedNotice') : t('complaintsList.openNotice')} tone={record.status === 'Resolved' ? 'success' : 'info'} icon="time-outline" style={styles.notice} />
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3), marginBottom: spacing(2) },
  subject: { flex: 1 },
  description: { marginBottom: spacing(3) },
  notice: { marginTop: spacing(4) },
});

export default ComplaintDetailScreen;
