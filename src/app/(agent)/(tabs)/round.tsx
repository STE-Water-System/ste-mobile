import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Card, Chip, Divider, Empty, Field, Header, IconButton, Loading, Notice, Screen } from '../../../components/ui';
import { ListRow, ProgressBar } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { useAgentRound } from '../../../hooks/useAgentRound';
import { customerNameOf, customerOf, readingIdOf } from '../../../services/api';
import { addressLineOf, filterRound, meterNumberOf, type RoundFilter } from '../../../lib/round';
import { formatMonthYear, readingIcon, readingLabel, readingTone } from '../../../lib/format';
import { colors, spacing, textStart, type } from '../../../theme';

const FILTERS: RoundFilter[] = ['all', 'todo', 'rejected', 'sent', 'approved'];

/**
 * The monthly round: every reading the commercial team assigned to this agent.
 * Rows are created back-office; here they are only opened and completed.
 */
const RoundScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const round = useAgentRound();

  const [filter, setFilter] = useState<RoundFilter>('all');
  const [search, setSearch] = useState('');

  // A stat card on the home screen can land here with a filter preselected.
  useEffect(() => {
    if (params.filter && FILTERS.includes(params.filter as RoundFilter)) setFilter(params.filter as RoundFilter);
  }, [params.filter]);

  const items: any[] = round.data?.items ?? [];
  const stats = round.data?.stats;
  const visible = useMemo(() => filterRound(items, filter), [items, filter]);
  const counts: Record<RoundFilter, number> = {
    all: items.length,
    todo: stats ? stats.pending + stats.rejected : 0,
    rejected: stats?.rejected ?? 0,
    sent: stats?.sent ?? 0,
    approved: stats?.approved ?? 0,
  };

  const openReading = (row: any) => {
    const code = customerOf(row)?.customerCode;
    if (!code) return;
    router.push({
      pathname: '/(agent)/reading/[code]',
      params: { code: String(code), meterId: String(row.meterId ?? row.meter?.meterId ?? '') },
    });
  };

  const lookup = () => {
    const code = search.trim();
    if (!code) return;
    router.push({ pathname: '/(agent)/reading/[code]', params: { code } });
  };

  return (
    <Screen scroll refreshing={round.isRefetching} onRefresh={() => round.refetch()}>
      <Header
        title={t('round.title')}
        subtitle={formatMonthYear(new Date(), i18n.language)}
        action={<IconButton icon="map-outline" variant="white" onPress={() => router.push('/(agent)/route')} accessibilityLabel={t('agentHome.tileRoute')} />}
      />

      <Field
        icon="search-outline"
        value={search}
        onChangeText={setSearch}
        placeholder={t('round.searchPlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={lookup}
        trailing={<IconButton icon="arrow-forward" variant="primary" size={32} onPress={lookup} accessibilityLabel={t('common.search')} />}
      />

      {!!stats && stats.total > 0 && (
        <Appear>
          <Card style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={[type.bodyStrong, textStart()]}>{t('round.progress', { done: stats.done, total: stats.total })}</Text>
              <Text style={[type.caption, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{Math.round(stats.progress * 100)}%</Text>
            </View>
            <ProgressBar value={stats.progress} />
            {stats.rejected > 0 && (
              <View style={styles.summaryHint}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={[type.caption, textStart(), { color: colors.danger }]}>{t('round.rejectedHint', { count: stats.rejected })}</Text>
              </View>
            )}
          </Card>
        </Appear>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((key) => (
          <Chip key={key} label={t(`round.filter.${key}`)} count={counts[key]} active={filter === key} onPress={() => setFilter(key)} />
        ))}
      </ScrollView>

      {round.isPending ? (
        <Loading label={t('common.loading')} />
      ) : round.error ? (
        <Notice text={(round.error as any)?.message || t('common.offline')} tone="danger" action={t('common.retry')} onAction={() => round.refetch()} />
      ) : visible.length === 0 ? (
        <Empty
          icon={items.length === 0 ? 'calendar-outline' : 'filter-outline'}
          title={items.length === 0 ? t('round.emptyTitle') : undefined}
          text={items.length === 0 ? t('agent.roundEmpty') : t('round.emptyFilter')}
        />
      ) : (
        <Card padded={false} style={styles.list}>
          {visible.map((row, index) => {
            const customer = customerOf(row);
            return (
              <Appear key={readingIdOf(row) ?? index} index={index} from={index < 12 ? 'down' : 'none'}>
                {index > 0 && <Divider inset />}
                <ListRow
                  icon={readingIcon(row)}
                  iconTone={readingTone(row)}
                  title={customerNameOf(customer) || meterNumberOf(row) || '—'}
                  subtitle={[customer?.customerCode, meterNumberOf(row), formatMonthYear(row.readingDate, i18n.language)].filter(Boolean).join(' · ')}
                  meta={addressLineOf(row) || undefined}
                  trailing={<Badge label={readingLabel(row, t)} tone={readingTone(row)} size="sm" />}
                  onPress={() => openReading(row)}
                  style={styles.row}
                />
              </Appear>
            );
          })}
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: { gap: spacing(2.5), marginBottom: spacing(1) },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chips: { gap: spacing(2), paddingVertical: spacing(4) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
});

export default RoundScreen;
