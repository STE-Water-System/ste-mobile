import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, Loading, Notice } from '../../components/ui';
import { SettingsButton } from '../../components/SettingsButton';
import { clientApi } from '../../services/api';
import { formatDate, readingLabel, readingTone } from '../../lib/format';
import { colors, radius, spacing, textStart, type } from '../../theme';
import { useCustomer } from '../../store/authStore';

const ReadingsScreen = () => {
  const { t } = useTranslation();
  const customer = useCustomer();
  const [meterIndex, setMeterIndex] = useState(0);

  const meters = customer?.meters ?? [];
  const meter = meters[meterIndex];

  const readings = useQuery({
    queryKey: ['client-consumption', meter?.meterId],
    enabled: !!meter,
    queryFn: () => clientApi.getConsumption(meter.meterId),
  });

  const items = readings.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={readings.isRefetching} onRefresh={() => readings.refetch()} />
        }
      >
        <Header
          title={t('client.tabReadings')}
          subtitle={meter?.meterNumber}
          action={<SettingsButton />}
        />

        {meters.length > 1 && (
          <View style={styles.meters}>
            {meters.map((item: any, index: number) => {
              const active = index === meterIndex;
              return (
                <TouchableOpacity
                  key={item.meterId}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setMeterIndex(index)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.meterNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!meter ? (
          <Empty text={t('agent.noMeter')} />
        ) : readings.isPending ? (
          <Loading />
        ) : readings.error ? (
          <Notice text={(readings.error as any)?.message || t('common.offline')} tone="danger" />
        ) : items.length === 0 ? (
          <Empty text={t('client.noReadings')} />
        ) : (
          <Card>
            {items.map((reading: any, index: number) => (
              <View key={reading.meterReadingId ?? reading.id ?? index}>
                {index > 0 && <Divider />}
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={[type.bodyStrong, textStart()]}>
                      {reading.consumption ?? 0} {t('common.unit')}
                    </Text>
                    <Text style={[type.caption, textStart()]}>
                      {formatDate(reading.readingDate || reading.createdAt)} · {t('client.index')}{' '}
                      {reading.currentIndex ?? '—'}
                    </Text>
                  </View>
                  <Badge label={readingLabel(reading, t)} tone={readingTone(reading)} />
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing(5), paddingBottom: spacing(8) },

  meters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(4) },
  chip: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
    gap: spacing(3),
  },
  rowText: { flex: 1 },
});

export default ReadingsScreen;
