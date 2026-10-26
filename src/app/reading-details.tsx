import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Card, Divider, Empty, Header, Line, Loading, Notice, Screen, SectionTitle } from '../components/ui';
import { Appear } from '../components/motion';
import { ACCESS_REASONS, meterApi } from '../services/api';
import { formatDate, formatIndex, readingLabel, readingTone } from '../lib/format';
import { colors, radius, spacing, textStart, type } from '../theme';

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
      <Header title={t('agent.readingDetails')} onBack={() => router.back()} />

      {reading.isPending ? (
        <Loading label={t('common.loading')} />
      ) : reading.error ? (
        <Notice text={(reading.error as any)?.message || t('common.offline')} tone="danger" />
      ) : !data ? (
        <Empty text={t('agent.noHistory')} />
      ) : (
        <>
          <Appear>
            <Card style={styles.summary}>
              <View style={styles.summaryHead}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="speedometer" size={22} color={colors.primary} />
                </View>
                <View style={styles.summaryText}>
                  <Text style={[type.caption, textStart()]}>{t('agent.meter')}</Text>
                  <Text style={[type.heading, textStart()]}>{data.meter?.meterNumber || '—'}</Text>
                </View>
                <Badge label={readingLabel(data, t)} tone={readingTone(data)} />
              </View>
              <View style={styles.figures}>
                <View style={styles.figure}>
                  <Text style={[type.caption, textStart()]}>{t('agent.previousIndex')}</Text>
                  <Text style={[type.amount, textStart()]}>{formatIndex(data.previousIndex ?? 0)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.placeholder} />
                <View style={styles.figure}>
                  <Text style={[type.caption, textStart()]}>{t('agent.currentIndex')}</Text>
                  <Text style={[type.amount, textStart()]}>{formatIndex(data.currentIndex ?? 0)}</Text>
                </View>
                <View style={[styles.figure, styles.figureAccent]}>
                  <Text style={[type.caption, textStart(), { color: colors.primary }]}>{t('agent.consumption')}</Text>
                  <Text style={[type.amount, textStart(), { color: colors.primary }]}>{formatIndex(data.consumption ?? 0)} {t('common.unit')}</Text>
                </View>
              </View>
            </Card>
          </Appear>

          <Appear index={1}>
            <Card style={styles.details}>
              <Line label={t('client.date')} value={formatDate(data.readingDate || data.createdAt)} />
              {data.accessReason && data.accessReason !== ACCESS_REASONS.Accessed && (
                <>
                  <Divider />
                  <Line label={t('agent.access')} value={t('agent.inaccessible')} tone="warning" />
                </>
              )}
              {!!data.comments && (
                <>
                  <Divider />
                  <Line label={t('agent.comment')} value={data.comments} />
                </>
              )}
            </Card>
          </Appear>

          {!!photo && (
            <Appear index={2}>
              <SectionTitle title={t('agent.photo')} />
              <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
            </Appear>
          )}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: { gap: spacing(4) },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  summaryIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1 },
  figures: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  figure: { flex: 1, gap: 2 },
  figureAccent: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing(2.5), flex: 1.3 },
  details: { marginTop: spacing(3) },
  photo: { height: 220, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
});

export default ReadingDetailsScreen;
