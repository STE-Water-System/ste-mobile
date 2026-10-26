import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Card, Divider, Empty, Header, Loading, Notice, Screen, SectionTitle } from '../../components/ui';
import { ListRow, StatCard } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { useAgentRound } from '../../hooks/useAgentRound';
import { MOCK_MINUTES_PER_STOP } from '../../mocks';
import { customerNameOf, customerOf, isEditableStatus, readingIdOf } from '../../services/api';
import { addressLineOf, groupByArea, meterNumberOf } from '../../lib/round';
import { readingLabel, readingTone } from '../../lib/format';
import { colors, radius, spacing, textStart, type } from '../../theme';

/**
 * The day's itinerary: readings still to do, grouped by area so the agent walks
 * one neighbourhood at a time. Built from the assigned round (unchanged call);
 * only the duration estimate is a mock constant.
 */
const RouteScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const round = useAgentRound();

  const items: any[] = round.data?.items ?? [];
  const todo = items.filter(isEditableStatus);
  const groups = groupByArea(todo);
  const minutes = todo.length * MOCK_MINUTES_PER_STOP;

  const openReading = (row: any) => {
    const code = customerOf(row)?.customerCode;
    if (!code) return;
    router.push({ pathname: '/(agent)/reading/[code]', params: { code: String(code), meterId: String(row.meterId ?? row.meter?.meterId ?? '') } });
  };

  let stop = 0;

  return (
    <Screen scroll refreshing={round.isRefetching} onRefresh={() => round.refetch()}>
      <Header title={t('route.title')} subtitle={t('route.subtitle')} onBack={() => router.back()} />

      {round.isPending ? (
        <Loading label={t('common.loading')} />
      ) : round.error ? (
        <Notice text={(round.error as any)?.message || t('common.offline')} tone="danger" />
      ) : todo.length === 0 ? (
        <Empty icon="checkmark-done-circle-outline" title={t('agentHome.allDoneTitle')} text={t('route.empty')} />
      ) : (
        <>
          <Appear>
            <View style={styles.stats}>
              <StatCard label={t('route.stops')} value={todo.length} icon="location-outline" />
              <StatCard label={t('route.areas')} value={groups.length} icon="map-outline" tone="accent" />
              <StatCard label={t('route.estimate')} value={minutes >= 60 ? t('route.hours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 }) : t('route.minutes', { minutes })} icon="time-outline" tone="warning" hint={t('mock.estimate')} />
            </View>
          </Appear>

          {groups.map((group, groupIndex) => (
            <View key={group.area}>
              <SectionTitle title={group.area} action={t('route.stopCount', { count: group.rows.length })} />
              <Appear index={groupIndex + 1}>
                <Card padded={false} style={styles.list}>
                  {group.rows.map((row, index) => {
                    stop += 1;
                    const customer = customerOf(row);
                    return (
                      <View key={readingIdOf(row) ?? `${group.area}-${index}`}>
                        {index > 0 && <Divider inset />}
                        <ListRow
                          leading={
                            <View style={styles.stopBubble}>
                              <Text style={styles.stopNumber}>{stop}</Text>
                            </View>
                          }
                          title={customerNameOf(customer) || meterNumberOf(row) || '—'}
                          subtitle={addressLineOf(row) || [customer?.customerCode, meterNumberOf(row)].filter(Boolean).join(' · ')}
                          trailing={<Badge label={readingLabel(row, t)} tone={readingTone(row)} size="sm" />}
                          onPress={() => openReading(row)}
                          style={styles.row}
                        />
                      </View>
                    );
                  })}
                </Card>
              </Appear>
            </View>
          ))}

          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textSubtle} />
            <Text style={[type.caption, textStart(), styles.hintText]}>{t('route.hint')}</Text>
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing(2.5) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3) },
  stopBubble: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stopNumber: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 13 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing(5) },
  hintText: { flex: 1 },
});

export default RouteScreen;
