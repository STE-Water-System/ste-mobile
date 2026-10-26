import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, MockBanner, Screen, SectionTitle, type Tone } from '../../components/ui';
import { ListRow } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { MOCK_OUTAGES, type MockOutage } from '../../mocks';
import { formatDateShort, formatTime } from '../../lib/format';
import { spacing } from '../../theme';

const TONES: Record<MockOutage['status'], Tone> = { ongoing: 'danger', planned: 'warning', resolved: 'success' };
const ORDER: MockOutage['status'][] = ['ongoing', 'planned', 'resolved'];

/** MOCK — planned works and incidents on the network, by neighbourhood. */
const OutagesScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const when = (outage: MockOutage) =>
    `${formatDateShort(outage.start, i18n.language)} ${formatTime(outage.start, i18n.language)} → ${formatDateShort(outage.end, i18n.language)} ${formatTime(outage.end, i18n.language)}`;

  return (
    <Screen scroll>
      <Header title={t('services.outages')} subtitle={t('outages.subtitle')} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      {MOCK_OUTAGES.length === 0 ? (
        <Empty icon="water-outline" text={t('outages.empty')} />
      ) : (
        ORDER.map((status, groupIndex) => {
          const rows = MOCK_OUTAGES.filter((outage) => outage.status === status);
          if (rows.length === 0) return null;
          return (
            <Appear key={status} index={groupIndex}>
              <SectionTitle title={t(`outages.status.${status}`)} style={groupIndex === 0 ? styles.firstSection : undefined} />
              <Card padded={false} style={styles.list}>
                {rows.map((outage, index) => (
                  <React.Fragment key={outage.id}>
                    {index > 0 && <Divider inset />}
                    <ListRow
                      icon={status === 'resolved' ? 'checkmark-circle-outline' : 'water-outline'}
                      iconTone={TONES[status]}
                      title={t(outage.titleKey)}
                      subtitle={t(outage.bodyKey)}
                      meta={`${outage.area} · ${when(outage)}`}
                      trailing={<Badge label={t(`outages.status.${status}`)} tone={TONES[status]} size="sm" />}
                      chevron={false}
                      style={styles.row}
                    />
                  </React.Fragment>
                ))}
              </Card>
            </Appear>
          );
        })
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: { marginTop: spacing(1) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
});

export default OutagesScreen;
