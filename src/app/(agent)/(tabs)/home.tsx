import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Card, Divider, Empty, IconButton, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Avatar, Hero, ListRow, ProgressBar, Skeleton, StatCard, Tile } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { useAgentRound } from '../../../hooks/useAgentRound';
import { useNotifications } from '../../../hooks/useNotifications';
import { MOCK_ANNOUNCEMENTS, MOCK_TASKS } from '../../../mocks';
import { customerNameOf, customerOf, isEditableStatus, isRejectedStatus, readingIdOf } from '../../../services/api';
import { addressLineOf, meterNumberOf } from '../../../lib/round';
import { formatDateShort, formatMonthYear, formatTime, readingIcon, readingLabel, readingTone } from '../../../lib/format';
import { useAgent } from '../../../store/authStore';
import { useLocalStore } from '../../../store/localStore';
import { colors, gradients, spacing, textStart, type } from '../../../theme';

/** Landing page: the month at a glance, then the shortest path to the next reading. */
const AgentHomeScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const agent = useAgent();
  const round = useAgentRound();
  const notifications = useNotifications('agent');
  const lastSyncAt = useLocalStore((state) => state.lastSyncAt);
  const touchSync = useLocalStore((state) => state.touchSync);
  const taskStatus = useLocalStore((state) => state.taskStatus);

  const stats = round.data?.stats;
  const items: any[] = round.data?.items ?? [];
  // Rejected readings first: they block billing until corrected.
  const next = [...items.filter(isRejectedStatus), ...items.filter((row) => isEditableStatus(row) && !isRejectedStatus(row))].slice(0, 3);
  const openTasks = MOCK_TASKS.filter((task) => (taskStatus[task.id] ?? task.status) === 'todo' || (taskStatus[task.id] ?? task.status) === 'in_progress').length;

  const firstName = (agent?.name || '').split(/\s+/)[0] || '';
  const today = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });

  const refresh = async () => {
    await round.refetch();
    touchSync();
  };

  const openReading = (row: any) => {
    const code = customerOf(row)?.customerCode;
    if (!code) return;
    router.push({
      pathname: '/(agent)/reading/[code]',
      params: { code: String(code), meterId: String(row.meterId ?? row.meter?.meterId ?? '') },
    });
  };

  return (
    <Screen scroll refreshing={round.isRefetching} onRefresh={refresh}>
      <View style={styles.top}>
        <Avatar name={agent?.name || 'A'} size={46} gradient={gradients.agent} />
        <View style={styles.greeting}>
          <Text style={[type.caption, textStart()]} numberOfLines={1}>
            {today}
          </Text>
          <Text style={[type.title, textStart()]} numberOfLines={1}>
            {t('agentHome.greeting', { name: firstName })}
          </Text>
        </View>
        <IconButton
          icon="notifications-outline"
          variant="white"
          badge={notifications.unread}
          onPress={() => router.push('/(agent)/notifications')}
          accessibilityLabel={t('nav.notifications')}
        />
      </View>

      <Appear>
        <Hero gradient={gradients.agent}>
          <View style={styles.heroHead}>
            <View style={styles.heroText}>
              <Text style={[styles.heroEyebrow, textStart()]}>{formatMonthYear(new Date(), i18n.language)}</Text>
              <Text style={[styles.heroTitle, textStart()]}>{t('agentHome.progressTitle')}</Text>
            </View>
            <Ionicons name="speedometer" size={28} color="rgba(255,255,255,0.9)" />
          </View>

          {round.isPending ? (
            <View style={styles.heroSkeleton}>
              <Skeleton width="40%" height={34} style={styles.skeletonOnDark} />
              <Skeleton height={8} style={styles.skeletonOnDark} />
            </View>
          ) : (
            <>
              <View style={styles.heroFigures}>
                <Text style={[styles.heroPercent, textStart()]}>{Math.round((stats?.progress ?? 0) * 100)}%</Text>
                <Text style={[styles.heroCount, textStart()]}>
                  {t('agentHome.progressCount', { done: stats?.done ?? 0, total: stats?.total ?? 0 })}
                </Text>
              </View>
              <ProgressBar value={stats?.progress ?? 0} tone="neutral" track="rgba(255,255,255,0.22)" height={10} style={styles.heroBar} />
              <View style={styles.heroFill} pointerEvents="none" />
            </>
          )}
        </Hero>
      </Appear>

      {round.error ? (
        <Notice text={(round.error as any)?.message || t('common.offline')} tone="danger" action={t('common.retry')} onAction={() => round.refetch()} />
      ) : null}

      <Appear index={1}>
        <View style={styles.grid}>
          <StatCard label={t('agentHome.assigned')} value={stats?.total ?? '—'} icon="list-outline" tone="info" onPress={() => router.push({ pathname: '/(agent)/(tabs)/round', params: { filter: 'all' } })} />
          <StatCard label={t('agentHome.todo')} value={stats?.pending ?? '—'} icon="time-outline" tone="warning" onPress={() => router.push({ pathname: '/(agent)/(tabs)/round', params: { filter: 'todo' } })} />
        </View>
        <View style={styles.grid}>
          <StatCard label={t('agentHome.sent')} value={stats?.sent ?? '—'} icon="paper-plane-outline" tone="accent" onPress={() => router.push({ pathname: '/(agent)/(tabs)/round', params: { filter: 'sent' } })} />
          <StatCard
            label={t('agentHome.approved')}
            value={stats?.approved ?? '—'}
            icon="checkmark-done-outline"
            tone="success"
            hint={stats?.rejected ? t('agentHome.rejectedHint', { count: stats.rejected }) : undefined}
            onPress={() => router.push({ pathname: '/(agent)/(tabs)/round', params: { filter: stats?.rejected ? 'rejected' : 'approved' } })}
          />
        </View>
      </Appear>

      <SectionTitle title={t('agentHome.quickActions')} />
      <Appear index={2}>
        <View style={styles.tiles}>
          <Tile label={t('agentHome.tileRound')} icon="speedometer-outline" onPress={() => router.push('/(agent)/(tabs)/round')} badge={stats?.pending ? String(stats.pending) : undefined} />
          <Tile label={t('agentHome.tileLookup')} icon="search-outline" tone="accent" onPress={() => router.push('/(agent)/(tabs)/clients')} />
          <Tile label={t('agentHome.tileTasks')} icon="construct-outline" tone="warning" onPress={() => router.push('/(agent)/tasks')} badge={openTasks ? String(openTasks) : undefined} />
          <Tile label={t('agentHome.tileIncident')} icon="warning-outline" tone="danger" onPress={() => router.push('/(agent)/incident')} />
          <Tile label={t('agentHome.tileRoute')} icon="map-outline" tone="success" onPress={() => router.push('/(agent)/route')} />
          <Tile label={t('agentHome.tileHistory')} icon="time-outline" tone="neutral" onPress={() => router.push('/(agent)/history')} />
        </View>
      </Appear>

      <SectionTitle title={t('agentHome.nextUp')} action={t('common.seeAll')} onAction={() => router.push({ pathname: '/(agent)/(tabs)/round', params: { filter: 'todo' } })} />
      <Appear index={3}>
        {round.isPending ? (
          <Card>
            <Skeleton height={44} />
            <Skeleton height={44} style={styles.skeletonGap} />
          </Card>
        ) : next.length === 0 ? (
          <Card>
            <Empty icon="checkmark-done-circle-outline" title={t('agentHome.allDoneTitle')} text={t('agentHome.allDoneText')} />
          </Card>
        ) : (
          <Card padded={false} style={styles.listCard}>
            {next.map((row, index) => {
              const customer = customerOf(row);
              return (
                <View key={readingIdOf(row) ?? index}>
                  {index > 0 && <Divider inset />}
                  <ListRow
                    icon={readingIcon(row)}
                    iconTone={readingTone(row)}
                    title={customerNameOf(customer) || meterNumberOf(row) || '—'}
                    subtitle={[customer?.customerCode, meterNumberOf(row)].filter(Boolean).join(' · ')}
                    meta={addressLineOf(row) || undefined}
                    trailing={<Badge label={readingLabel(row, t)} tone={readingTone(row)} size="sm" />}
                    onPress={() => openReading(row)}
                    style={styles.listRow}
                  />
                </View>
              );
            })}
          </Card>
        )}
      </Appear>

      <SectionTitle title={t('agentHome.announcements')} />
      <Appear index={4}>
        <Card>
          {MOCK_ANNOUNCEMENTS.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <Divider />}
              <View style={styles.announcement}>
                <View style={styles.announcementHead}>
                  <Badge label={t('mock.banner')} tone="warning" size="sm" icon="flask-outline" />
                  <Text style={type.tiny}>{formatDateShort(item.date, i18n.language)}</Text>
                </View>
                <Text style={[type.bodyStrong, textStart()]}>{t(item.titleKey)}</Text>
                <Text style={[type.caption, textStart()]}>{t(item.bodyKey)}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Appear>

      <Appear index={5}>
        <Card tone="success" style={styles.sync}>
          <Ionicons name="cloud-done-outline" size={20} color={colors.success} />
          <View style={styles.syncText}>
            <Text style={[type.bodyStrong, textStart(), { color: colors.success }]}>{t('agentHome.syncOk')}</Text>
            <Text style={[type.caption, textStart()]}>
              {lastSyncAt
                ? t('agentHome.syncAt', { time: `${formatDateShort(lastSyncAt, i18n.language)} ${formatTime(lastSyncAt, i18n.language)}` })
                : t('agentHome.syncPull')}
            </Text>
          </View>
        </Card>
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(5) },
  greeting: { flex: 1 },

  heroHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3) },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroTitle: { marginTop: 3, fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.white },
  heroFigures: { flexDirection: 'row', alignItems: 'baseline', gap: spacing(3), marginTop: spacing(5) },
  heroPercent: { fontSize: 40, fontFamily: 'Inter_800ExtraBold', color: colors.white, letterSpacing: -1 },
  heroCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  heroBar: { marginTop: spacing(3) },
  heroFill: { display: 'none' },
  heroSkeleton: { marginTop: spacing(5), gap: spacing(3) },
  skeletonOnDark: { backgroundColor: 'rgba(255,255,255,0.25)' },

  grid: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(3) },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },

  listCard: { paddingHorizontal: spacing(4) },
  listRow: { paddingVertical: spacing(3.5) },
  skeletonGap: { marginTop: spacing(3) },

  announcement: { paddingVertical: spacing(2.5), gap: 4 },
  announcementHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },

  sync: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(4) },
  syncText: { flex: 1 },
});

export default AgentHomeScreen;
