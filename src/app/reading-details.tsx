import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, Line, Loading, Notice, Screen } from '../components/ui';
import { ACCESS_REASONS, meterApi } from '../services/api';
import { formatDate, readingLabel, readingTone } from '../lib/format';
import { arrowBack, colors, radius, spacing } from '../theme';

/** GET /api/meter-readings/:id — the full record behind a history row. */
const ReadingDetailsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  // The meter comes back with the reading, so only the reading id is needed.
  const { readingId } = useLocalSearchParams<{ readingId?: string }>();
  const id = Number(readingId);

  const reading = useQuery({
    queryKey: ['reading', id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: () => meterApi.getReadingById(id),
  });

  const data = reading.data;
  const photo = data?.evidencePhotoUrl;

  return (
    <Screen scroll>
      <Header
        title={t('agent.readingDetails')}
        action={
          <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backLabel}>{arrowBack()}</Text>
          </TouchableOpacity>
        }
      />

      {reading.isPending ? (
        <Loading />
      ) : reading.error ? (
        <Notice text={(reading.error as any)?.message || t('common.offline')} tone="danger" />
      ) : !data ? (
        <Empty text={t('agent.noHistory')} />
      ) : (
        <>
          <View style={styles.status}>
            <Badge label={readingLabel(data, t)} tone={readingTone(data)} />
          </View>

          <Card>
            <Line label={t('agent.meter')} value={data.meter?.meterNumber || '—'} />
            <Divider />
            <Line label={t('client.date')} value={formatDate(data.readingDate || data.createdAt)} />
            <Divider />
            <Line label={t('agent.previousIndex')} value={`${data.previousIndex ?? 0} ${t('common.unit')}`} />
            <Divider />
            <Line label={t('agent.currentIndex')} value={`${data.currentIndex ?? 0} ${t('common.unit')}`} />
            <Divider />
            <Line label={t('agent.consumption')} value={`${data.consumption ?? 0} ${t('common.unit')}`} strong />
            {data.accessReason && data.accessReason !== ACCESS_REASONS.Accessed && (
              <>
                <Divider />
                <Line label={t('agent.access')} value={t('agent.inaccessible')} />
              </>
            )}
            {!!data.comments && (
              <>
                <Divider />
                <Line label={t('agent.comment')} value={data.comments} />
              </>
            )}
          </Card>

          {!!photo && (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          )}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: { fontSize: 16, color: colors.textMuted },

  status: { alignItems: 'flex-start', paddingBottom: spacing(4) },
  photo: {
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing(4),
  },
});

export default ReadingDetailsScreen;
