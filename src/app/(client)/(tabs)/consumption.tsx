import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Chip, Divider, Empty, Header, Loading, Notice, Screen, SectionTitle } from '../../../components/ui';
import { ListRow, StatCard } from '../../../components/blocks';
import { BarChart } from '../../../components/charts';
import { Appear } from '../../../components/motion';
import { useClientConsumption } from '../../../hooks/useClientData';
import { isApprovedStatus } from '../../../services/api';
import { formatDate, formatIndex, formatMonthShort, readingIcon, readingLabel, readingTone } from '../../../lib/format';
import { useCustomer } from '../../../store/authStore';
import { colors, spacing, textStart, type } from '../../../theme';

/** Consumption history per meter (GET /api/client/consumption/:meterId, unchanged). */
const ConsumptionScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const [meterIndex, setMeterIndex] = useState(0);

  const meters: any[] = customer?.meters ?? [];
  const meter = meters[meterIndex];
  const readings = useClientConsumption(meter?.meterId);

  const items: any[] = readings.data ?? [];
  const approved = items.filter(isApprovedStatus);
  const latest = approved[0] ?? items[0];
  const chart = [...items]
    .slice(0, 8)
    .reverse()
    .map((reading) => ({ label: formatMonthShort(reading.readingDate || reading.createdAt, i18n.language), value: Number(reading.consumption) || 0 }));
  const average = items.length ? Math.round(items.reduce((sum, reading) => sum + (Number(reading.consumption) || 0), 0) / items.length) : 0;

  return (
    <Screen scroll refreshing={readings.isRefetching} onRefresh={() => readings.refetch()}>
      <Header title={t('nav.consumption')} subtitle={meter?.meterNumber} />

      {meters.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {meters.map((item: any, index: number) => (
            <Chip key={item.meterId} label={String(item.meterNumber)} icon="speedometer-outline" active={index === meterIndex} onPress={() => setMeterIndex(index)} />
          ))}
        </ScrollView>
      )}

      {!meter ? (
        <Empty icon="speedometer-outline" text={t('agent.noMeter')} />
      ) : readings.isPending ? (
        <Loading label={t('common.loading')} />
      ) : readings.error ? (
        <Notice text={(readings.error as any)?.message || t('common.offline')} tone="danger" action={t('common.retry')} onAction={() => readings.refetch()} />
      ) : items.length === 0 ? (
        <Empty icon="water-outline" text={t('client.noReadings')} />
      ) : (
        <>
          <Appear>
            <View style={styles.stats}>
              <StatCard label={t('consumption.last')} value={`${formatIndex(latest?.consumption ?? 0)} ${t('common.unit')}`} icon="water-outline" tone="accent" />
              <StatCard label={t('consumption.average')} value={`${formatIndex(average)} ${t('common.unit')}`} icon="analytics-outline" />
            </View>
            <View style={styles.stats}>
              <StatCard label={t('consumption.currentIndex')} value={formatIndex(latest?.currentIndex ?? 0)} icon="speedometer-outline" tone="neutral" />
              <StatCard label={t('consumption.lastReading')} value={formatDate(latest?.readingDate || latest?.createdAt)} icon="calendar-outline" tone="success" />
            </View>
          </Appear>

          <SectionTitle title={t('consumption.chartTitle')} />
          <Appear index={1}>
            <Card>
              <BarChart data={chart} unit={t('common.unit')} />
            </Card>
          </Appear>

          <Appear index={2}>
            <Button label={t('services.selfReading')} icon="camera-outline" variant="secondary" onPress={() => router.push('/(client)/self-reading')} style={styles.selfReading} />
          </Appear>

          <SectionTitle title={t('consumption.history')} />
          <Card padded={false} style={styles.list}>
            {items.map((reading: any, index: number) => (
              <Appear key={reading.meterReadingId ?? reading.id ?? index} index={index}>
                {index > 0 && <Divider inset />}
                <ListRow
                  icon={readingIcon(reading)}
                  iconTone={readingTone(reading)}
                  title={`${formatIndex(reading.consumption ?? 0)} ${t('common.unit')}`}
                  subtitle={`${formatDate(reading.readingDate || reading.createdAt)} · ${t('client.index')} ${formatIndex(reading.currentIndex ?? '—')}`}
                  trailing={<Badge label={readingLabel(reading, t)} tone={readingTone(reading)} size="sm" />}
                  chevron={false}
                  style={styles.row}
                />
              </Appear>
            ))}
          </Card>

          <Text style={[type.caption, textStart(), styles.hint]}>{t('consumption.hint')}</Text>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { gap: spacing(2), paddingBottom: spacing(4) },
  stats: { flexDirection: 'row', gap: spacing(3), marginBottom: spacing(3) },
  selfReading: { marginTop: spacing(3) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3) },
  hint: { marginTop: spacing(4), color: colors.textSubtle },
});

export default ConsumptionScreen;
