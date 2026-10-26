import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, Divider, IconButton, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Avatar, Hero, ListRow, Skeleton, Tile } from '../../../components/blocks';
import { BarChart } from '../../../components/charts';
import { Appear } from '../../../components/motion';
import { useClientBills, useClientConsumption } from '../../../hooks/useClientData';
import { useNotifications } from '../../../hooks/useNotifications';
import { MOCK_OUTAGES, MOCK_TIPS } from '../../../mocks';
import { billBalance, formatCurrency, isBillPaid } from '../../../services/api';
import { formatDateShort, formatMonthShort } from '../../../lib/format';
import { useCustomer } from '../../../store/authStore';
import { colors, gradients, spacing, textStart, type } from '../../../theme';

/** Customer landing: balance first, then the actions a household needs most. */
const ClientHomeScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const bills = useClientBills(customer);
  const meter = customer?.meters?.[0];
  const readings = useClientConsumption(meter?.meterId);
  const notifications = useNotifications('client');

  const all: any[] = bills.data ?? [];
  const unpaid = all.filter((bill: any) => !isBillPaid(bill));
  const due = unpaid.reduce((total: number, bill: any) => total + billBalance(bill), 0);

  const chart = [...(readings.data ?? [])]
    .slice(0, 6)
    .reverse()
    .map((reading: any) => ({ label: formatMonthShort(reading.readingDate || reading.createdAt, i18n.language), value: Number(reading.consumption) || 0 }));

  const ongoing = MOCK_OUTAGES.find((outage) => outage.status === 'ongoing');
  const tip = MOCK_TIPS[new Date().getDate() % MOCK_TIPS.length];
  const firstName = customer?.firstName || '';
  const recent = notifications.items.slice(0, 2);

  return (
    <Screen scroll refreshing={bills.isRefetching} onRefresh={() => bills.refetch()}>
      <View style={styles.top}>
        <Avatar name={`${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`} size={46} gradient={gradients.client} />
        <View style={styles.greeting}>
          <Text style={[type.caption, textStart()]} numberOfLines={1}>{customer?.customerCode}</Text>
          <Text style={[type.title, textStart()]} numberOfLines={1}>{t('clientHome.greeting', { name: firstName })}</Text>
        </View>
        <IconButton icon="notifications-outline" variant="white" badge={notifications.unread} onPress={() => router.push('/(client)/notifications')} accessibilityLabel={t('nav.notifications')} />
      </View>

      <Appear>
        <Hero gradient={gradients.client}>
          <Text style={[styles.heroLabel, textStart()]}>{t('client.balanceDue')}</Text>
          {bills.isPending ? (
            <Skeleton width="55%" height={38} style={styles.skeletonOnDark} />
          ) : (
            <Text style={[styles.heroAmount, textStart()]}>
              {formatCurrency(due)} <Text style={styles.heroCurrency}>{t('common.currency')}</Text>
            </Text>
          )}
          <View style={styles.heroRow}>
            <Badge label={unpaid.length === 0 ? t('client.upToDate') : t('agent.overdue', { count: unpaid.length })} tone={unpaid.length === 0 ? 'success' : 'danger'} />
            {!!meter && (
              <Text style={styles.heroMeter} numberOfLines={1}>
                <Ionicons name="speedometer-outline" size={12} color="rgba(255,255,255,0.85)" /> {meter.meterNumber}
              </Text>
            )}
          </View>
          <View style={styles.heroActions}>
            <Button label={t('clientHome.payNow')} icon="wallet-outline" variant="white" size="sm" onPress={() => router.push('/(client)/pay')} disabled={unpaid.length === 0} style={styles.heroButton} />
            <Button label={t('clientHome.viewBills')} variant="ghost" size="sm" onPress={() => router.push('/(client)/(tabs)/bills')} style={[styles.heroButton, styles.heroGhost]} />
          </View>
        </Hero>
      </Appear>

      {bills.error ? <Notice text={(bills.error as any)?.message || t('common.offline')} tone="danger" action={t('common.retry')} onAction={() => bills.refetch()} /> : null}

      {!!ongoing && (
        <Appear index={1}>
          <Notice
            tone="warning"
            icon="water-outline"
            title={t(ongoing.titleKey)}
            text={`${ongoing.area} · ${t('outages.until', { time: formatDateShort(ongoing.end, i18n.language) })}`}
            action={t('common.details')}
            onAction={() => router.push('/(client)/outages')}
            style={styles.outage}
          />
        </Appear>
      )}

      <SectionTitle title={t('clientHome.quickActions')} action={t('common.seeAll')} onAction={() => router.push('/(client)/(tabs)/services')} />
      <Appear index={2}>
        <View style={styles.tiles}>
          <Tile label={t('services.pay')} icon="wallet-outline" onPress={() => router.push('/(client)/pay')} />
          <Tile label={t('services.reclamation')} icon="chatbubble-ellipses-outline" tone="danger" onPress={() => router.push('/(client)/reclamation')} />
          <Tile label={t('services.installation')} icon="construct-outline" tone="accent" onPress={() => router.push('/(client)/installation')} />
          <Tile label={t('services.verification')} icon="shield-checkmark-outline" tone="success" onPress={() => router.push('/(client)/verification')} />
          <Tile label={t('services.selfReading')} icon="camera-outline" tone="warning" onPress={() => router.push('/(client)/self-reading')} />
          <Tile label={t('services.complaints')} icon="list-outline" tone="neutral" onPress={() => router.push('/(client)/complaints')} />
        </View>
      </Appear>

      <SectionTitle title={t('clientHome.consumption')} action={t('common.details')} onAction={() => router.push('/(client)/(tabs)/consumption')} />
      <Appear index={3}>
        <Card>
          {readings.isPending && !!meter ? (
            <Skeleton height={120} />
          ) : (
            <BarChart data={chart} unit={t('common.unit')} emptyText={t('client.noReadings')} />
          )}
        </Card>
      </Appear>

      <SectionTitle title={t('nav.notifications')} action={t('common.seeAll')} onAction={() => router.push('/(client)/notifications')} />
      <Appear index={4}>
        <Card padded={false} style={styles.listCard}>
          {recent.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <Divider inset />}
              <ListRow
                icon={item.kind === 'bill' ? 'receipt-outline' : item.kind === 'outage' ? 'water-outline' : item.kind === 'payment' ? 'checkmark-circle-outline' : 'chatbubble-ellipses-outline'}
                iconTone={item.kind === 'outage' ? 'warning' : item.kind === 'payment' ? 'success' : 'info'}
                title={t(item.titleKey)}
                subtitle={t(item.bodyKey)}
                trailing={!item.read ? <View style={styles.dot} /> : undefined}
                onPress={() => router.push('/(client)/notifications')}
                style={styles.listRow}
              />
            </View>
          ))}
        </Card>
      </Appear>

      <Appear index={5}>
        <Card tone="accent" style={styles.tip}>
          <View style={styles.tipIcon}>
            <Ionicons name={tip.icon} size={20} color={colors.accent} />
          </View>
          <View style={styles.tipText}>
            <Text style={[type.bodyStrong, textStart(), { color: colors.accent }]}>{t(tip.titleKey)}</Text>
            <Text style={[type.caption, textStart()]}>{t(tip.bodyKey)}</Text>
          </View>
        </Card>
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(5) },
  greeting: { flex: 1 },

  heroLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroAmount: { marginTop: 4, fontSize: 34, fontFamily: 'Inter_800ExtraBold', color: colors.white, letterSpacing: -1 },
  heroCurrency: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), marginTop: spacing(3) },
  heroMeter: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  heroActions: { flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(5) },
  heroButton: { flex: 1 },
  heroGhost: { backgroundColor: 'rgba(255,255,255,0.18)' },
  skeletonOnDark: { backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 6 },

  outage: { marginTop: spacing(4) },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },

  listCard: { paddingHorizontal: spacing(4) },
  listRow: { paddingVertical: spacing(3) },
  dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: colors.primary },

  tip: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(4) },
  tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, gap: 2 },
});

export default ClientHomeScreen;
