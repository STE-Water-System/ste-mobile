import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Chip, Divider, Empty, Header, MockBanner, Screen } from '../../components/ui';
import { ListRow } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { useComplaintRecords } from '../../hooks/useClientRecords';
import { complaintTone, formatDateShort } from '../../lib/format';
import { spacing } from '../../theme';

type Filter = 'all' | 'open' | 'closed';

/** MOCK list — "plaintes": every complaint the customer filed, with its progress. */
const ComplaintsScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const records = useComplaintRecords();
  const [filter, setFilter] = useState<Filter>('all');

  const isOpen = (status: string) => status === 'Open' || status === 'In_Progress';
  const visible = records.filter((row) => (filter === 'all' ? true : filter === 'open' ? isOpen(row.status) : !isOpen(row.status)));
  const openCount = records.filter((row) => isOpen(row.status)).length;

  return (
    <Screen scroll>
      <Header title={t('services.complaints')} subtitle={t('complaintsList.subtitle', { count: openCount })} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Button label={t('complaintsList.new')} icon="add-circle-outline" variant="secondary" onPress={() => router.push('/(client)/reclamation')} />
      </Appear>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t('round.filter.all')} count={records.length} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={t('complaintsList.open')} count={openCount} active={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label={t('complaintsList.closed')} count={records.length - openCount} active={filter === 'closed'} onPress={() => setFilter('closed')} />
      </ScrollView>

      {visible.length === 0 ? (
        <Empty icon="chatbubbles-outline" text={t('complaintsList.empty')} />
      ) : (
        <Card padded={false} style={styles.list}>
          {visible.map((row, index) => (
            <Appear key={row.id} index={index}>
              {index > 0 && <Divider inset />}
              <ListRow
                icon="chatbubble-ellipses-outline"
                iconTone={complaintTone(row.status)}
                title={row.subjectKey ? t(row.subjectKey) : row.subject}
                subtitle={`${row.reference} · ${t(`complaints.type_${row.category}`, row.category)}`}
                meta={formatDateShort(row.updatedAt, i18n.language)}
                trailing={<Badge label={t(`complaintStatus.${row.status}`)} tone={complaintTone(row.status)} size="sm" />}
                onPress={() => router.push({ pathname: '/(client)/complaint/[id]', params: { id: row.id } })}
                style={styles.row}
              />
            </Appear>
          ))}
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { gap: spacing(2), paddingVertical: spacing(4) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
});

export default ComplaintsScreen;
